package com.flashhook.domain.webhook.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class IncomingWebhookPayload {
    private final String method;
    private final String url;
    private final String contentType;
    private final String clientIp;
    private final Map<String, String> headers;
    private final Map<String, String> queryParams;
    private final String rawBody;
    private final long bodySize;
}
