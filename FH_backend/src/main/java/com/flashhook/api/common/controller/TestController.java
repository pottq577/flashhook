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
import org.springframework.web.bind.annotation.RestController;
import java.util.Objects;
import java.util.Set;

@RestController
@RequestMapping("/api/test")
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
    public ResponseEntity<String> cleanup(@RequestHeader("X-Admin-Key") String adminKey) {
        if (!adminSecretKey.equals(adminKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid Admin Key");
        }

        try {
            // Clean Redis (Rate limits, etc.)
            Set<String> keys = redisTemplate.keys("*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
            
            // Clean MongoDB (Endpoints, Logs)
            mongoTemplate.remove(new Query(), "endpoints");
            mongoTemplate.remove(new Query(), "logs");
            
            return ResponseEntity.ok("Cleanup successful");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cleanup failed: " + e.getMessage());
        }
    }
}
