package com.flashhook.domain.webhook.dto;

import com.flashhook.domain.webhook.model.WebhookLog;
import java.time.Instant;
import lombok.Builder;

/**
 * 웹훅 로그 목록 응답 DTO
 */
@Builder
public record WebhookLogResponse(
    String logId,
    String method,
    String contentType,
    String clientIp,
    String bodyPreview,
    long bodySize,
    Instant receivedAt
) {
    /**
     * WebhookLog → WebhookLogResponse 변환 팩토리 메소드
     */
    public static WebhookLogResponse from(WebhookLog log) {
        if (log == null) return null;
        return WebhookLogResponse.builder()
            .logId(log.getLogId())
            .method(log.getMethod())
            .contentType(log.getContentType())
            .clientIp(log.getClientIp())
            .bodyPreview(log.getBodyPreview())
            .bodySize(log.getBodySize())
            .receivedAt(log.getReceivedAt())
            .build();
    }
}
