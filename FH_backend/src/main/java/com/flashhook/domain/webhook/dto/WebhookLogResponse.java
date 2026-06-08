package com.flashhook.domain.webhook.dto;

import com.flashhook.domain.webhook.model.WebhookLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 웹훅 로그 목록 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLogResponse {

    private String logId;
    private String method;
    private String contentType;
    private String clientIp;
    private String bodyPreview;
    private long bodySize;
    private Instant receivedAt;

    /**
     * WebhookLog → WebhookLogResponse 변환 팩토리 메소드
     */
    public static WebhookLogResponse from(WebhookLog log) {
        // TODO: 구현 필요
        return null;
    }
}
