package com.flashhook.domain.webhook.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.http.HttpHeaders;

@Getter
@Builder(toBuilder = true)
public class WebhookPayload {
    private final String method;
    private final HttpHeaders headers;
    private final String body;
}
