package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.dto.WebhookLogDetailResponse;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/**
 * 웹훅 로그 조회/삭제 서비스
 */
@Service
@RequiredArgsConstructor
public class WebhookLogService {

    private final WebhookLogRepository webhookLogRepository;
    private final com.flashhook.domain.endpoint.repository.EndpointRepository endpointRepository;

    /**
     * 로그 목록 조회 (페이징)
     */
    public Page<WebhookLogResponse> getLogs(String endpointId, int page, int size, String sort) {
        org.springframework.data.domain.Sort.Direction direction = "asc".equalsIgnoreCase(sort) 
                ? org.springframework.data.domain.Sort.Direction.ASC 
                : org.springframework.data.domain.Sort.Direction.DESC;
        
        org.springframework.data.domain.PageRequest pageRequest = 
                org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, "receivedAt"));

        Page<com.flashhook.domain.webhook.model.WebhookLog> logPage = webhookLogRepository.findByEndpointId(endpointId, pageRequest);
        return logPage.map(WebhookLogResponse::from);
    }

    /**
     * 로그 상세 조회
     */
    public WebhookLogDetailResponse getLogDetail(String endpointId, String logId) {
        com.flashhook.domain.webhook.model.WebhookLog log = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new com.flashhook.global.exception.CustomException(com.flashhook.global.exception.ErrorCode.ENDPOINT_NOT_FOUND)); // TODO: LOG_NOT_FOUND 에러코드 분리 가능하지만 단순하게
        
        if (!log.getEndpointId().equals(endpointId)) {
            throw new com.flashhook.global.exception.CustomException(com.flashhook.global.exception.ErrorCode.INVALID_TOKEN);
        }
        
        return WebhookLogDetailResponse.from(log);
    }

    /**
     * 엔드포인트의 모든 로그 삭제
     */
    public void deleteAll(String endpointId) {
        webhookLogRepository.deleteAllByEndpointId(endpointId);
        endpointRepository.findByEndpointId(endpointId).ifPresent(endpoint -> {
            com.flashhook.domain.endpoint.model.Endpoint updated = endpoint.toBuilder()
                    .logCount(0)
                    .logSizeBytes(0)
                    .build();
            endpointRepository.save(updated);
        });
    }
}
