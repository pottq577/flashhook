package com.flashhook.domain.endpoint.dto;

import com.flashhook.domain.endpoint.model.MockConfig;
import java.time.Instant;
import java.util.Map;
import lombok.Builder;

/**
 * 엔드포인트 응답 DTO
 */
@Builder(toBuilder = true)
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
