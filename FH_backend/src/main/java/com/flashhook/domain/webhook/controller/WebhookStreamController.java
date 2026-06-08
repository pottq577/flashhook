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
@RestController
@RequestMapping("/api/endpoints/{endpointId}")
@RequiredArgsConstructor
public class WebhookStreamController {

    private final SseEmitterService sseEmitterService;

    /**
     * SSE 스트림 구독
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String endpointId) {
        // TODO: 구현 필요
        return null;
    }
}
