package com.flashhook.domain.admin.dto;

import lombok.Builder;

@Builder
public record AdminMetricsResponse(
    long endpointsCreatedToday,
    long totalWebhooksReceived,
    int activeSseConnections
) {}
