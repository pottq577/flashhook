package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE 스트림 컨트롤러
 * 실시간 웹훅 수신 알림을 클라이언트에 전달
 */
import com.flashhook.global.config.SseConfig;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.UUID;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/endpoints/{endpointId}")
@RequiredArgsConstructor
public class WebhookStreamController {

    private final SseEmitterService sseEmitterService;
    private final SseConfig sseConfig;
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * SSE 스트림 구독
     */
    @PostMapping("/stream-token")
    public ResponseEntity<Map<String, String>> createStreamToken(@PathVariable String endpointId) {
        String streamToken = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set("stream_token:" + streamToken, endpointId, 30, TimeUnit.SECONDS);
        return ResponseEntity.ok(Map.of("streamToken", streamToken));
    }

    /**
     * SSE 스트림 구독
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@PathVariable String endpointId, @RequestParam(name = "streamToken", required = false) String streamToken) {
        if (streamToken == null || streamToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String key = "stream_token:" + streamToken;
        String storedEndpointId = redisTemplate.opsForValue().get(key);
        
        if (storedEndpointId == null || !storedEndpointId.equals(endpointId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        redisTemplate.delete(key); // One-time use
        return ResponseEntity.ok(sseEmitterService.subscribe(endpointId, sseConfig.getTimeout()));
    }
}
