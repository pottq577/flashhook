package com.flashhook.domain.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspiciousEndpointDto {
    private String endpointId;
    private String creatorIp;
    private int logCount;
    private long logSizeBytes;
    private Instant createdAt;
}
