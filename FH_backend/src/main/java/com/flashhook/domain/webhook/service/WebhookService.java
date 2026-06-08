package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/**
 * 웹훅 수신 처리 서비스
 */
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookLogRepository webhookLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 웹훅 수신 처리
     */
    public void receive(String endpointId, HttpServletRequest request) {
        // TODO: 구현 필요
    }
}
