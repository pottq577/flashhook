package com.flashhook.domain.endpoint.service;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import java.time.Instant;
import java.time.Duration;
import java.util.UUID;
import java.util.Map;

/**
 * 엔드포인트 비즈니스 로직
 */
@Service
@RequiredArgsConstructor
public class EndpointService {

    private final EndpointRepository endpointRepository;

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
        String endpointId = UUID.randomUUID().toString().substring(0, 8);
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
                .build();
    }

    /**
     * 엔드포인트 삭제
     */
    public void delete(String endpointId) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));
        endpointRepository.delete(endpoint);
        // 연관 로그는 별도 이벤트나 스케줄러를 통해 삭제하거나 WebhookLogService를 호출하여 삭제해야 함 (여기선 생략 또는 이벤트
        // 발행)
    }
}
