package com.flashhook.domain.endpoint.service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.dto.MockUpdateRequest;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.global.config.FlashHookProperties;
import com.flashhook.global.event.EndpointDeletedEvent;
import com.flashhook.global.exception.EndpointException;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.util.EncryptionUtil;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 엔드포인트 비즈니스 로직
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EndpointService {

    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MeterRegistry meterRegistry;
    private final EncryptionUtil encryptionUtil;
    private final FlashHookProperties properties;

    private String buildWebhookUrl(String endpointId) {
        return properties.baseUrl() + "/api/hooks/" + endpointId;
    }

    private String buildDashboardUrl(String endpointId) {
        return properties.feUrl() + "/dashboard/" + endpointId;
    }

    private Map<String, Object> buildLimits() {
        return Map.of("maxLogs", properties.log().maxCount(), "maxSizeMb",
                properties.log().maxSizeBytes() / 1024 / 1024);
    }

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
                .label(request != null ? request.label() : null)
                .creatorIp(ip)
                .logCount(0)
                .logSizeBytes(0)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        endpointRepository.save(Objects.requireNonNull(endpoint));
        log.info("Endpoint created successfully: endpointId={}, creatorIp={}", endpointId, ip);

        meterRegistry.counter("flashhook.endpoint.created.total").increment();

        return EndpointResponse.builder()
                .endpointId(endpointId)
                .accessToken(accessToken)
                .label(endpoint.getLabel())
                .webhookUrl(buildWebhookUrl(endpointId))
                .dashboardUrl(buildDashboardUrl(endpointId))
                .expiresAt(expiresAt)
                .limits(buildLimits())
                .mockConfig(endpoint.getMockConfig())
                .build();
    }

    /**
     * 엔드포인트 정보 조회
     */
    public EndpointResponse getInfo(String endpointId) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new EndpointException(ErrorCode.ENDPOINT_NOT_FOUND));

        return EndpointResponse.builder()
                .endpointId(endpoint.getEndpointId())
                .accessToken(null) // 보안상 조회 시 미반환
                .label(endpoint.getLabel())
                .webhookUrl(buildWebhookUrl(endpointId))
                .dashboardUrl(buildDashboardUrl(endpointId))
                .expiresAt(endpoint.getExpiresAt())
                .limits(buildLimits())
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
                .orElseThrow(() -> new EndpointException(ErrorCode.ENDPOINT_NOT_FOUND));
        endpointRepository.delete(Objects.requireNonNull(endpoint));
        log.info("Endpoint deleted: endpointId={}", endpointId);
        eventPublisher.publishEvent(new EndpointDeletedEvent(endpointId));
    }

    /**
     * 모의 설정 업데이트
     */
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public EndpointResponse updateMockConfig(String endpointId, MockUpdateRequest request) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new EndpointException(ErrorCode.ENDPOINT_NOT_FOUND));

        MockConfig.MockConfigBuilder mockBuilder = endpoint.getMockConfig() != null
                ? endpoint.getMockConfig().toBuilder()
                : MockConfig.builder();

        if (request.statusCode() != null)
            mockBuilder.statusCode(request.statusCode());
        if (request.delayMs() != null)
            mockBuilder.delayMs(request.delayMs());
        if (request.headers() != null)
            mockBuilder.headers(request.headers());
        if (request.body() != null)
            mockBuilder.body(request.body());

        String presetType = request.presetType();
        if (presetType == null || presetType.isBlank()) {
            mockBuilder.presetType(null);
        } else {
            mockBuilder.presetType(presetType.trim());
        }

        if (request.presetOptions() != null) {
            Map<String, Object> options = new HashMap<>(request.presetOptions());
            if (options.containsKey("secretKey")) {
                Object secretObj = options.get("secretKey");
                if (secretObj instanceof String plainSecret && !plainSecret.isBlank()) {
                    options.put("secretKey", encryptionUtil.encrypt(plainSecret));
                } else {
                    options.remove("secretKey");
                }
            }
            mockBuilder.presetOptions(options);
        }

        Endpoint updatedEndpoint = endpoint.toBuilder()
                .mockConfig(mockBuilder.build())
                .build();

        endpointRepository.save(Objects.requireNonNull(updatedEndpoint));
        log.info("Mock config updated: endpointId={}", endpointId);

        return EndpointResponse.builder()
                .endpointId(updatedEndpoint.getEndpointId())
                .accessToken(null)
                .label(updatedEndpoint.getLabel())
                .webhookUrl(buildWebhookUrl(endpointId))
                .dashboardUrl(buildDashboardUrl(endpointId))
                .expiresAt(updatedEndpoint.getExpiresAt())
                .limits(buildLimits())
                .mockConfig(updatedEndpoint.getMockConfig())
                .build();
    }
}
