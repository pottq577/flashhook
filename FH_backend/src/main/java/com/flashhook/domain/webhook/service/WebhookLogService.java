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
    public Page<WebhookLogResponse> getLogs(String endpointId, int page, int size, String sort) {
        Direction direction = "asc".equalsIgnoreCase(sort)
                ? Direction.ASC
                : Direction.DESC;

        PageRequest pageRequest = PageRequest.of(page,
                size, Sort.by(direction, "receivedAt"));

        Page<WebhookLog> logPage = webhookLogRepository.findByEndpointId(endpointId,
                pageRequest);
        return logPage.map(WebhookLogResponse::from);
    }

    /**
     * 로그 상세 조회
     */
    public WebhookLogDetailResponse getLogDetail(String endpointId, String logId) {
        WebhookLog log = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ENDPOINT_NOT_FOUND)); // TODO: LOG_NOT_FOUND 에러코드 분리
                                                        // 가능하지만 단순하게

        if (!log.getEndpointId().equals(endpointId)) {
            throw new CustomException(
                    ErrorCode.INVALID_TOKEN);
        }

        return WebhookLogDetailResponse.from(log);
    }

    /**
     * 엔드포인트의 모든 로그 삭제
     */
    public void deleteAll(String endpointId) {
        webhookLogRepository.deleteAllByEndpointId(endpointId);
        endpointRepository.findByEndpointId(endpointId).ifPresent(endpoint -> {
            Endpoint updated = endpoint.toBuilder()
                    .logCount(0)
                    .logSizeBytes(0)
                    .build();
            endpointRepository.save(updated);
        });
    }
}
