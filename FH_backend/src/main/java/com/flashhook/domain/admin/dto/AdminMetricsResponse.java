package com.flashhook.domain.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminMetricsResponse {
    private long endpointsCreatedToday;
    private long totalWebhooksReceived;
    private int activeSseConnections;
}
