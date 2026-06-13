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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.InetAddress;
import java.net.UnknownHostException;

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
            throw new CustomException(ErrorCode.INVALID_REQUEST);
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
                if (direction == Direction.ASC) {
                    logPage = webhookLogRepository.findByEndpointIdAndReceivedAtGreaterThanOrderByReceivedAtAscLogIdAsc(endpointId, lastLog.getReceivedAt(), pageRequest);
                } else {
                    logPage = webhookLogRepository.findByEndpointIdAndReceivedAtLessThanOrderByReceivedAtDescLogIdDesc(endpointId, lastLog.getReceivedAt(), pageRequest);
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
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public void deleteAll(String endpointId) {
        endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        webhookLogRepository.deleteAllByEndpointId(endpointId);
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().set("logCount", 0).set("logSizeBytes", 0L);
        mongoTemplate.updateFirst(query, update, Endpoint.class);
    }

    /**
     * 로그 재전송 (Replay)
     */
    public void replayLog(String endpointId, String logId, String destinationUrl) {
        validateReplayDestination(destinationUrl);

        WebhookLog log = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new CustomException(ErrorCode.LOG_NOT_FOUND));

        if (!log.getEndpointId().equals(endpointId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        if (log.getHeaders() != null) {
            log.getHeaders().forEach(headers::add);
        }
        // 원래 Host 헤더는 충돌할 수 있으므로 제거
        headers.remove(HttpHeaders.HOST);
        
        HttpEntity<Object> entity = new HttpEntity<>(log.getBody(), headers);
        
        try {
            restTemplate.exchange(
                destinationUrl,
                HttpMethod.valueOf(log.getMethod()),
                entity,
                String.class
            );
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private void validateReplayDestination(String destinationUrl) {
        try {
            URI uri = new URI(destinationUrl);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            
            InetAddress inetAddress = InetAddress.getByName(uri.getHost());
            if (inetAddress.isAnyLocalAddress() || 
                inetAddress.isLoopbackAddress() || 
                inetAddress.isLinkLocalAddress() || 
                inetAddress.isSiteLocalAddress() || 
                inetAddress.isMulticastAddress()) {
                throw new CustomException(ErrorCode.FORBIDDEN);
            }
        } catch (URISyntaxException | UnknownHostException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }
}
