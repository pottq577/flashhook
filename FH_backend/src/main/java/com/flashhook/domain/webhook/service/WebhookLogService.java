package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.dto.WebhookLogDetailResponse;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.endpoint.model.Endpoint;
import org.springframework.transaction.annotation.Transactional;

/**
 * 웹훅 로그 조회/삭제 서비스
 */
@Service
@RequiredArgsConstructor
public class WebhookLogService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;

    /**
     * 로그 목록 조회 (페이징)
     */
    public Page<WebhookLogResponse> getLogs(String endpointId, String lastSeenId, int page, int size, String sort) {
        if (page < 0 || size <= 0 || size > 100) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Direction direction = "asc".equalsIgnoreCase(sort)
                ? Direction.ASC
                : Direction.DESC;

        PageRequest pageRequest = PageRequest.of(page,
                size, Sort.by(direction, "receivedAt"));

        Page<WebhookLog> logPage;
        if (lastSeenId != null && !lastSeenId.isEmpty()) {
            WebhookLog lastLog = webhookLogRepository.findByLogId(lastSeenId).orElse(null);
            if (lastLog != null) {
                logPage = webhookLogRepository.findByEndpointIdAndReceivedAtLessThanOrderByReceivedAtDesc(endpointId, lastLog.getReceivedAt(), pageRequest);
            } else {
                logPage = webhookLogRepository.findByEndpointId(endpointId, pageRequest);
            }
        } else {
            logPage = webhookLogRepository.findByEndpointId(endpointId, pageRequest);
        }
        
        return logPage.map(WebhookLogResponse::from);
    }

    /**
     * 로그 상세 조회
     */
    public WebhookLogDetailResponse getLogDetail(String endpointId, String logId) {
        WebhookLog log = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new CustomException(ErrorCode.LOG_NOT_FOUND));

        if (!log.getEndpointId().equals(endpointId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        return WebhookLogDetailResponse.from(log);
    }

    /**
     * 엔드포인트의 모든 로그 삭제
     */
    @Transactional
    public void deleteAll(String endpointId) {
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        webhookLogRepository.deleteAllByEndpointId(endpointId);
        
        Endpoint updated = endpoint.toBuilder()
                .logCount(0)
                .logSizeBytes(0L)
                .build();
        endpointRepository.save(updated);
    }
}
