package com.flashhook.domain.webhook.dto;

import com.flashhook.domain.webhook.model.WebhookLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * 웹훅 로그 상세 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLogDetailResponse {

    private String logId;
    private String method;
    private String contentType;
    private String clientIp;
    private String bodyPreview;
    private long bodySize;
    private Instant receivedAt;

    // 상세 필드
    private String url;
    private Map<String, String> headers;
    private Map<String, String> queryParams;
    private Object body;

    /**
     * WebhookLog → WebhookLogDetailResponse 변환 팩토리 메소드
     */
    public static WebhookLogDetailResponse from(WebhookLog log) {
        if (log == null) return null;
        return WebhookLogDetailResponse.builder()
                .logId(log.getLogId())
                .method(log.getMethod())
                .contentType(log.getContentType())
                .clientIp(log.getClientIp())
                .bodyPreview(log.getBodyPreview())
                .bodySize(log.getBodySize())
                .receivedAt(log.getReceivedAt())
                .url(log.getUrl())
                .headers(log.getHeaders())
                .queryParams(log.getQueryParams())
                .body(log.getBody())
                .build();
    }
}
