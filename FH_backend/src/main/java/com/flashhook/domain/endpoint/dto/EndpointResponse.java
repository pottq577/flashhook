package com.flashhook.domain.endpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * 엔드포인트 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EndpointResponse {

    private String endpointId;
    private String accessToken;
    private String label;
    private String webhookUrl;
    private String dashboardUrl;
    private Instant expiresAt;
    private Map<String, Object> limits;
}
