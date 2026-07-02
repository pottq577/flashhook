package com.flashhook.domain.endpoint.dto;

import java.time.Instant;
import java.util.Map;

import com.flashhook.domain.endpoint.model.MockConfig;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 엔드포인트 응답 DTO
 */
@Builder
public record EndpointResponse(
    String endpointId,
    String accessToken,
    String label,
    String webhookUrl,
    String dashboardUrl,
    Instant expiresAt,
    Map<String, Object> limits,
    MockConfig mockConfig
) {}
