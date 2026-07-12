package com.flashhook.api.common.controller;

import com.flashhook.global.ratelimit.RateLimitService;
import com.flashhook.global.util.IpUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@Profile({ "local", "test" })
@ConditionalOnProperty(
    name = "flashhook.test-endpoints.enabled",
    havingValue = "true"
)
public class TestController {

    private final StringRedisTemplate redisTemplate;
    private final MongoTemplate mongoTemplate;
    private final RateLimitService rateLimitService;

    @Value("${flashhook.admin.secret-key}")
    private String adminSecretKey;

    public TestController(
        StringRedisTemplate redisTemplate,
        MongoTemplate mongoTemplate,
        RateLimitService rateLimitService
    ) {
        this.redisTemplate = redisTemplate;
        this.mongoTemplate = mongoTemplate;
        this.rateLimitService = rateLimitService;
    }

    private boolean isNotAllowedOrInvalidKey(
        HttpServletRequest request,
        String adminKey
    ) {
        // Rate Limit (Brute Force 방어 - 분당 5회 제한, fail-closed)
        String clientIp = IpUtil.normalize(request.getRemoteAddr());
        if (
            !rateLimitService.isAllowed(
                "rl:test:cleanup:" + clientIp,
                5,
                60,
                false
            )
        ) {
            return true;
        }

        return (
            adminKey == null ||
            !MessageDigest.isEqual(
                adminSecretKey.getBytes(StandardCharsets.UTF_8),
                adminKey.getBytes(StandardCharsets.UTF_8)
            )
        );
    }

    @PostMapping("/cleanup/redis")
    public ResponseEntity<String> cleanupRedis(
        HttpServletRequest request,
        @RequestHeader("X-Admin-Key") String adminKey
    ) {
        if (isNotAllowedOrInvalidKey(request, adminKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                "Invalid Admin Key or Rate limit exceeded"
            );
        }

        try {
            redisTemplate.execute(
                (RedisCallback<Void>) connection -> {
                    connection.serverCommands().flushDb();
                    return null;
                }
            );
            return ResponseEntity.ok("Redis cleanup successful");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                "Redis cleanup failed: " + e.getMessage()
            );
        }
    }

    @PostMapping("/cleanup/mongo")
    public ResponseEntity<String> cleanupMongo(
        HttpServletRequest request,
        @RequestHeader("X-Admin-Key") String adminKey
    ) {
        if (isNotAllowedOrInvalidKey(request, adminKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                "Invalid Admin Key or Rate limit exceeded"
            );
        }

        try {
            mongoTemplate.remove(new Query(), "endpoints");
            mongoTemplate.remove(new Query(), "logs");
            return ResponseEntity.ok("MongoDB cleanup successful");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                "MongoDB cleanup failed: " + e.getMessage()
            );
        }
    }
}
