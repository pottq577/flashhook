package com.flashhook.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "flashhook")
public record FlashHookProperties(
    LogProperties log,
    RateLimitProperties ratelimit,
    AdminProperties admin,
    SecurityProperties security,
    @DefaultValue("http://localhost:8080") String baseUrl,
    @DefaultValue("http://localhost:5173") String feUrl
) {
    public record LogProperties(
        @DefaultValue("500") int maxCount,
        @DefaultValue("5242880") long maxSizeBytes,
        @DefaultValue("300") int bodyPreviewLength
    ) {}

    public record RateLimitProperties(
        @DefaultValue("5") int endpointCreate,
        @DefaultValue("100") int webhookReceive,
        @DefaultValue("true") boolean failOpen,
        @DefaultValue("false") boolean blacklistFailOpen
    ) {}

    public record AdminProperties(
        String secretKey
    ) {}

    public record SecurityProperties(
        String secretKey
    ) {}
}
