package com.flashhook.domain.webhook.dto;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.flashhook.domain.webhook.model.WebhookLog;

import lombok.Builder;

@Builder
public record PublicWebhookLogResponse(
        String logId,
        String method,
        Instant receivedAt,
        Map<String, String> safeHeaders,
        String bodyStatus) {
    private static final Set<String> ALLOWED_HEADERS = Set.of(
            "host", "content-type", "user-agent", "accept", "content-length", "connection");

    public static PublicWebhookLogResponse from(WebhookLog log) {
        Map<String, String> filteredHeaders = log.getHeaders().entrySet().stream()
                .filter(entry -> ALLOWED_HEADERS.contains(entry.getKey().toLowerCase()))
                .collect(Collectors.toMap(
                        entry -> entry.getKey().toLowerCase(),
                        entry -> entry.getValue()));

        return PublicWebhookLogResponse.builder()
                .logId(log.getLogId())
                .method(log.getMethod())
                .receivedAt(log.getReceivedAt())
                .safeHeaders(filteredHeaders)
                .bodyStatus("MASKED")
                .build();
    }
}
