package com.flashhook.domain.endpoint.service;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 엔드포인트 비즈니스 로직
 */
@Service
@RequiredArgsConstructor
public class EndpointService {

    private final EndpointRepository endpointRepository;

    @org.springframework.beans.factory.annotation.Value("${flashhook.log.max-count:500}")
    private int maxLogCount;

    @org.springframework.beans.factory.annotation.Value("${flashhook.log.max-size-bytes:5242880}")
    private long maxLogSizeBytes;

    /**
     * 엔드포인트 생성
     */
    public EndpointResponse create(EndpointCreateRequest request, String ip) {
        String endpointId = java.util.UUID.randomUUID().toString().substring(0, 8);
        String accessToken = com.flashhook.global.security.AccessTokenUtil.generateToken();
        String accessTokenHash = com.flashhook.global.security.AccessTokenUtil.hashToken(accessToken);
        
        java.time.Instant now = java.time.Instant.now();
        java.time.Instant expiresAt = now.plus(java.time.Duration.ofHours(24));

        com.flashhook.domain.endpoint.model.Endpoint endpoint = com.flashhook.domain.endpoint.model.Endpoint.builder()
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
                .webhookUrl("https://api.flashhook.kr/api/hooks/" + endpointId) // 추후 env에서 주입 가능
                .dashboardUrl("https://flashhook.kr/dashboard/" + endpointId)
                .expiresAt(expiresAt)
                .limits(java.util.Map.of("maxLogs", maxLogCount, "maxSizeMb", maxLogSizeBytes / 1024 / 1024))
                .build();
    }

    /**
     * 엔드포인트 정보 조회
     */
    public EndpointResponse getInfo(String endpointId) {
        com.flashhook.domain.endpoint.model.Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new com.flashhook.global.exception.CustomException(com.flashhook.global.exception.ErrorCode.ENDPOINT_NOT_FOUND));

        return EndpointResponse.builder()
                .endpointId(endpoint.getEndpointId())
                .accessToken(null) // 보안상 조회 시 미반환
                .label(endpoint.getLabel())
                .webhookUrl("https://api.flashhook.kr/api/hooks/" + endpointId)
                .dashboardUrl("https://flashhook.kr/dashboard/" + endpointId)
                .expiresAt(endpoint.getExpiresAt())
                .limits(java.util.Map.of("maxLogs", maxLogCount, "maxSizeMb", maxLogSizeBytes / 1024 / 1024))
                .build();
    }

    /**
     * 엔드포인트 삭제
     */
    public void delete(String endpointId) {
        com.flashhook.domain.endpoint.model.Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new com.flashhook.global.exception.CustomException(com.flashhook.global.exception.ErrorCode.ENDPOINT_NOT_FOUND));
        endpointRepository.delete(endpoint);
        // 연관 로그는 별도 이벤트나 스케줄러를 통해 삭제하거나 WebhookLogService를 호출하여 삭제해야 함 (여기선 생략 또는 이벤트 발행)
    }
}
