package com.flashhook.domain.webhook.controller;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.flashhook.domain.webhook.service.SseEmitterService;
import com.flashhook.global.config.SseConfig;

import lombok.RequiredArgsConstructor;

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
        redisTemplate.opsForValue().set(
                Objects.requireNonNull("stream_token:" + streamToken),
                Objects.requireNonNull(endpointId),
                30,
                TimeUnit.SECONDS);
        return ResponseEntity.ok(Map.of("streamToken", streamToken));
    }

    /**
     * SSE 스트림 구독
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@PathVariable String endpointId,
            @RequestParam(name = "streamToken", required = false) String streamToken) {
        if (streamToken == null || streamToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String key = "stream_token:" + streamToken;
        String storedEndpointId = redisTemplate.opsForValue().getAndDelete(key);

        if (storedEndpointId == null || !storedEndpointId.equals(endpointId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(sseEmitterService.subscribe(endpointId, sseConfig.getTimeout()));
    }
}
