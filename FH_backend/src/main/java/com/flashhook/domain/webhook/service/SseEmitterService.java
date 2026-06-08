package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE(Server-Sent Events) 관리 서비스
 * 클라이언트 구독 및 웹훅 이벤트 전파 담당
 */
@Service
public class SseEmitterService {

    /**
     * SSE 구독 생성
     */
    public SseEmitter subscribe(String endpointId, long timeout) {
        // TODO: 구현 필요
        return null;
    }

    /**
     * 웹훅 수신 이벤트 처리 → SSE 전파
     */
    @Async
    @EventListener
    public void handleWebhookReceived(WebhookReceivedEvent event) {
        // TODO: 구현 필요
    }
}
