package com.flashhook.domain.webhook.dto;

import java.util.Map;
import lombok.Builder;

@Builder
public record IncomingWebhookPayload(
    String method,
    String url,
    String contentType,
    String clientIp,
    Map<String, String> headers,
    Map<String, String> queryParams,
    String rawBody,
    long bodySize
) {}
