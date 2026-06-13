package com.flashhook.domain.endpoint.service;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.dto.MockUpdateRequest;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import java.time.Instant;
import java.time.Duration;
import java.util.UUID;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import com.flashhook.global.event.EndpointDeletedEvent;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;

/**
 * 엔드포인트 비즈니스 로직
 */
@Service
@RequiredArgsConstructor
public class EndpointService {

    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${flashhook.log.max-count:500}")
    private int maxLogCount;

    @Value("${flashhook.log.max-size-bytes:5242880}")
    private long maxLogSizeBytes;

    @Value("${flashhook.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${flashhook.fe-url:http://localhost:5173}")
    private String feUrl;

    /**
     * 엔드포인트 생성
     */
    public EndpointResponse create(EndpointCreateRequest request, String ip) {
        String endpointId = UUID.randomUUID().toString().replace("-", "");
        String accessToken = com.flashhook.global.security.AccessTokenUtil.generateToken();
        String accessTokenHash = com.flashhook.global.security.AccessTokenUtil.hashToken(accessToken);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofHours(24));

        Endpoint endpoint = Endpoint.builder()
                .endpointId(endpointId)
                .accessTokenHash(accessTokenHash)
                .label(request != null ? request.getLabel() : null)
                .creatorIp(ip)
                .logCount(0)
                .logSizeBytes(0)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        endpointRepository.save(endpoint);

        return EndpointResponse.builder()
                .endpointId(endpointId)
                .accessToken(accessToken)
                .label(endpoint.getLabel())
                .webhookUrl(baseUrl + "/api/hooks/" + endpointId)
                .dashboardUrl(feUrl + "/dashboard/" + endpointId)
                .expiresAt(expiresAt)
                .limits(Map.of("maxLogs", maxLogCount, "maxSizeMb", maxLogSizeBytes / 1024 / 1024))
                .mockConfig(endpoint.getMockConfig())
                .build();
    }

    /**
     * 엔드포인트 정보 조회
     */
    public EndpointResponse getInfo(String endpointId) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        return EndpointResponse.builder()
                .endpointId(endpoint.getEndpointId())
                .accessToken(null) // 보안상 조회 시 미반환
                .label(endpoint.getLabel())
                .webhookUrl(baseUrl + "/api/hooks/" + endpointId)
                .dashboardUrl(feUrl + "/dashboard/" + endpointId)
                .expiresAt(endpoint.getExpiresAt())
                .limits(Map.of("maxLogs", maxLogCount, "maxSizeMb", maxLogSizeBytes / 1024 / 1024))
                .mockConfig(endpoint.getMockConfig())
                .build();
    }

    /**
     * 엔드포인트 삭제
     */
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public void delete(String endpointId) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));
        endpointRepository.delete(endpoint);
        eventPublisher.publishEvent(new EndpointDeletedEvent(endpointId));
    }

    /**
     * 모의 설정 업데이트
     */
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public EndpointResponse updateMockConfig(String endpointId, MockUpdateRequest request) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        MockConfig.MockConfigBuilder mockBuilder = 
            endpoint.getMockConfig() != null ? endpoint.getMockConfig().toBuilder() : MockConfig.builder();

        if (request.getStatusCode() != null) mockBuilder.statusCode(request.getStatusCode());
        if (request.getDelayMs() != null) mockBuilder.delayMs(request.getDelayMs());
        if (request.getHeaders() != null) mockBuilder.headers(request.getHeaders());
        if (request.getBody() != null) mockBuilder.body(request.getBody());
        
        String presetType = request.getPresetType();
        if (presetType == null || presetType.isBlank()) {
            mockBuilder.presetType(null);
        } else {
            mockBuilder.presetType(presetType.trim());
        }

        Endpoint updatedEndpoint = endpoint.toBuilder()
                .mockConfig(mockBuilder.build())
                .build();

        endpointRepository.save(updatedEndpoint);

        return EndpointResponse.builder()
                .endpointId(updatedEndpoint.getEndpointId())
                .accessToken(null)
                .label(updatedEndpoint.getLabel())
                .webhookUrl(baseUrl + "/api/hooks/" + endpointId)
                .dashboardUrl(feUrl + "/dashboard/" + endpointId)
                .expiresAt(updatedEndpoint.getExpiresAt())
                .limits(Map.of("maxLogs", maxLogCount, "maxSizeMb", maxLogSizeBytes / 1024 / 1024))
                .mockConfig(updatedEndpoint.getMockConfig())
                .build();
    }
}
