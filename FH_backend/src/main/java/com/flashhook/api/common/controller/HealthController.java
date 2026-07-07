package com.flashhook.api.common.controller;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final MongoTemplate mongoTemplate;
    private final StringRedisTemplate redisTemplate;

    public HealthController(MongoTemplate mongoTemplate, StringRedisTemplate redisTemplate) {
        this.mongoTemplate = mongoTemplate;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping({"/health", "/actuator/health"})
    public ResponseEntity<Map<String, String>> health() {
        try {
            mongoTemplate.executeCommand("{ ping: 1 }");
            redisTemplate.getConnectionFactory().getConnection().ping();
            return ResponseEntity.ok(Map.of("status", "UP"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("status", "DOWN"));
        }
    }
}
