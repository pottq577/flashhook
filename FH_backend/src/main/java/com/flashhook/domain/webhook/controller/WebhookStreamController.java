package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.service.SseEmitterService;
import com.flashhook.global.config.SseConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/endpoints/{endpointId}")
@RequiredArgsConstructor
public class WebhookStreamController {

    private final SseEmitterService sseEmitterService;
    private final SseConfig sseConfig;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@PathVariable String endpointId) {
        // 인증은 AccessTokenFilter에서 HttpOnly 쿠키(fh_token_{endpointId})를 통해 처리됩니다.
        return ResponseEntity.ok(
            sseEmitterService.subscribe(endpointId, sseConfig.getTimeout())
        );
    }
}
