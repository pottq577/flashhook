package com.flashhook.domain.webhook.dto;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.flashhook.domain.webhook.model.WebhookLog;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 웹훅 로그 상세 응답 DTO
 */
@Builder
public record WebhookLogDetailResponse(
    String logId,
    String method,
    String contentType,
    String clientIp,
    String bodyPreview,
    long bodySize,
    Instant receivedAt,
    String url,
    Map<String, String> headers,
    Map<String, String> queryParams,
    Object body
) {

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "authorization", "x-api-key", "cookie", "x-auth-token",
            "token", "password", "secret", "access_token", "refresh_token");

    private static Map<String, String> sanitizeMap(Map<String, String> input) {
        if (input == null)
            return null;
        return input.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> SENSITIVE_KEYS.contains(e.getKey().toLowerCase()) ? "[REDACTED]" : e.getValue()));
    }

    /**
     * WebhookLog → WebhookLogDetailResponse 변환 팩토리 메소드
     */
    public static WebhookLogDetailResponse from(WebhookLog log) {
        if (log == null)
            return null;
        return WebhookLogDetailResponse.builder()
                .logId(log.getLogId())
                .method(log.getMethod())
                .contentType(log.getContentType())
                .clientIp(log.getClientIp())
                .bodyPreview(log.getBodyPreview())
                .bodySize(log.getBodySize())
                .receivedAt(log.getReceivedAt())
                .url(log.getUrl())
                .headers(sanitizeMap(log.getHeaders()))
                .queryParams(sanitizeMap(log.getQueryParams()))
                .body(log.getBody())
                .build();
    }
}
