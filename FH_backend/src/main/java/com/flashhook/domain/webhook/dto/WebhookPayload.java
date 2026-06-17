package com.flashhook.domain.webhook.dto;

import org.springframework.http.HttpHeaders;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder(toBuilder = true)
public class WebhookPayload {
    private final String method;
    private final HttpHeaders headers;
    private final String body;
}
