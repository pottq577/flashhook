package com.flashhook.domain.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Builder
public record AdminMetricsResponse(
    long endpointsCreatedToday,
    long totalWebhooksReceived,
    int activeSseConnections
) {}
