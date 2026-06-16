package com.flashhook.domain.webhook.dto;

import java.util.Map;

import lombok.Builder;
import lombok.Getter;

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
