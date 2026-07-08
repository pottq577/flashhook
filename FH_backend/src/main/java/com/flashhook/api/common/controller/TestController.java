package com.flashhook.api.common.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Objects;
import java.util.Set;
import org.springframework.context.annotation.Profile;

@RestController
@RequestMapping("/api/test")
@Profile({"local", "test"})
public class TestController {

    private final StringRedisTemplate redisTemplate;
    private final MongoTemplate mongoTemplate;
    
    @Value("${flashhook.admin.secret-key}")
    private String adminSecretKey;

    public TestController(StringRedisTemplate redisTemplate, MongoTemplate mongoTemplate) {
        this.redisTemplate = redisTemplate;
        this.mongoTemplate = mongoTemplate;
    }

    @PostMapping("/cleanup")
    public ResponseEntity<String> cleanup(
            @RequestHeader("X-Admin-Key") String adminKey,
            @RequestParam(value = "type", defaultValue = "all") String type) {
        if (adminKey == null || !java.security.MessageDigest.isEqual(
                adminSecretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                adminKey.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid Admin Key");
        }

        try {
            // Clean Redis (Rate limits, etc.)
            redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Void>) connection -> {
                connection.serverCommands().flushDb();
                return null;
            });
            
            // Clean MongoDB (Endpoints, Logs)
            if ("all".equalsIgnoreCase(type)) {
                mongoTemplate.remove(new Query(), "endpoints");
                mongoTemplate.remove(new Query(), "logs");
            }
            
            return ResponseEntity.ok("Cleanup successful");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cleanup failed: " + e.getMessage());
        }
    }
}
