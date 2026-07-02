package com.flashhook.domain.admin.dto;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Builder
public record SuspiciousEndpointDto(
    String endpointId,
    String creatorIp,
    int logCount,
    long logSizeBytes,
    Instant createdAt
) {}
