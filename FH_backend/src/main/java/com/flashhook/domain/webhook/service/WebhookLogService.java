package com.flashhook.domain.webhook.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.dto.WebhookLogDetailResponse;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.global.exception.BusinessException;
import com.flashhook.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * 웹훅 로그 조회/삭제 서비스
 */
@Service
@RequiredArgsConstructor
public class WebhookLogService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final MongoTemplate mongoTemplate;

    /**
     * 로그 목록 조회 (페이징)
     */
    public Page<WebhookLogResponse> getLogs(String endpointId, String lastSeenId, int page, int size, String sort) {
        if (page < 0 || size <= 0 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        Direction direction = "asc".equalsIgnoreCase(sort)
                ? Direction.ASC
                : Direction.DESC;

        PageRequest pageRequest = PageRequest.of(page,
                size, Sort.by(direction, "receivedAt").and(Sort.by(direction, "logId")));

        Page<WebhookLog> logPage;
        if (lastSeenId != null && !lastSeenId.isEmpty()) {
            // 커서 기반 조회 시 페이지는 0으로 고정
            pageRequest = PageRequest.of(0, size, Sort.by(direction, "receivedAt").and(Sort.by(direction, "logId")));

            WebhookLog lastLog = webhookLogRepository.findByLogId(lastSeenId).orElse(null);
            if (lastLog != null) {
                if (!lastLog.getEndpointId().equals(endpointId)) {
                    throw new BusinessException(ErrorCode.INVALID_REQUEST);
                }
                if (direction == Direction.ASC) {
                    logPage = webhookLogRepository.findNextPage(
                            endpointId, lastLog.getReceivedAt(), lastLog.getLogId(), pageRequest);
                } else {
                    logPage = webhookLogRepository.findPreviousPage(
                            endpointId, lastLog.getReceivedAt(), lastLog.getLogId(), pageRequest);
                }
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
        WebhookLog webhookLog = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOG_NOT_FOUND));

        if (!webhookLog.getEndpointId().equals(endpointId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return WebhookLogDetailResponse.from(webhookLog);
    }

    /**
     * 엔드포인트의 모든 로그 삭제
     */
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public void deleteAll(String endpointId) {
        endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENDPOINT_NOT_FOUND));

        webhookLogRepository.deleteAllByEndpointId(endpointId);
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().set("logCount", 0).set("logSizeBytes", 0L);
        mongoTemplate.updateFirst(query, update, Endpoint.class);
    }
}
