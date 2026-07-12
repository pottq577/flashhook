package com.flashhook.domain.admin.dto;

import java.time.Instant;
import lombok.Builder;

@Builder
public record SuspiciousEndpointDto(
    String endpointId,
    String creatorIp,
    int logCount,
    long logSizeBytes,
    Instant createdAt
) {}
