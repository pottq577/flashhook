package com.flashhook.domain.webhook.dto;

import org.springframework.http.HttpHeaders;

import lombok.Builder;

@Builder(toBuilder = true)
public record WebhookPayload(
        String method,
        HttpHeaders headers,
        String body) {
}
