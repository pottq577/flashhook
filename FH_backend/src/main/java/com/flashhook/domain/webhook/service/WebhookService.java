package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.domain.Sort;

import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${flashhook.log.max-count:500}")
    private int maxLogCount;

    @Value("${flashhook.log.max-size-bytes:5242880}")
    private long maxLogSizeBytes;

    @Value("${flashhook.log.body-preview-length:300}")
    private int bodyPreviewLength;

    @Transactional
    public MockConfig receive(String endpointId, IncomingWebhookPayload payload) {
        // 1. 엔드포인트 확인
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        // 4. Object Body 및 Preview 생성
        Object bodyObj = payload.getRawBody();
        if (payload.getContentType() != null && payload.getContentType().toLowerCase().contains("application/json")) {
            try {
                bodyObj = objectMapper.readValue(payload.getRawBody(), Object.class);
            } catch (Exception e) {
                // 파싱 실패 시 원본 문자열 유지
            }
        }

        String bodyPreview = payload.getRawBody();
        if (payload.getRawBody() != null && payload.getRawBody().length() > bodyPreviewLength) {
            int cutIndex = payload.getRawBody().offsetByCodePoints(0,
                    Math.min(payload.getRawBody().codePointCount(0, payload.getRawBody().length()), bodyPreviewLength));
            bodyPreview = payload.getRawBody().substring(0, cutIndex);
        }

        // 5. Capped Collection 로직은 DB 저장 후 처리 (원자적 카운트 이후)

        // 6. DB 저장
        WebhookLog log = WebhookLog.builder()
                .logId(UUID.randomUUID().toString().replace("-", ""))
                .endpointId(endpointId)
                .method(payload.getMethod())
                .url(payload.getUrl())
                .headers(payload.getHeaders())
                .queryParams(payload.getQueryParams())
                .body(bodyObj)
                .bodyPreview(bodyPreview)
                .contentType(payload.getContentType())
                .clientIp(payload.getClientIp())
                .bodySize(payload.getBodySize())
                .receivedAt(Instant.now())
                .build();
        webhookLogRepository.save(log);

        // 7. 엔드포인트 카운터 업데이트 (Atomic)
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().inc("logCount", 1).inc("logSizeBytes", payload.getBodySize());
        Endpoint updatedEndpoint = mongoTemplate.findAndModify(
                query,
                update,
                org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
                Endpoint.class);

        if (updatedEndpoint != null) {
            enforceLogCap(updatedEndpoint);
        }

        // 8. 이벤트 발행 (SSE 전파용)
        eventPublisher.publishEvent(new WebhookReceivedEvent(log));

        return endpoint.getMockConfig() != null ? endpoint.getMockConfig() : new MockConfig();
    }

    private void enforceLogCap(Endpoint endpoint) {
        long currentCount = endpoint.getLogCount();
        long currentSize = endpoint.getLogSizeBytes();

        while (currentCount > maxLogCount || currentSize > maxLogSizeBytes) {
            int fetchSize = (int) Math.max(currentCount - maxLogCount, 50);
            if (fetchSize > 1000) fetchSize = 1000;
            
            Query findOldestQuery = new Query(Criteria.where("endpointId").is(endpoint.getEndpointId()))
                    .with(Sort.by(Sort.Direction.ASC, "receivedAt"))
                    .limit(fetchSize);
            findOldestQuery.fields().include("_id").include("bodySize");
            
            java.util.List<WebhookLog> oldLogs = mongoTemplate.find(findOldestQuery, WebhookLog.class);
            
            if (oldLogs.isEmpty()) {
                break;
            }
            
            long sizeToRemove = 0;
            int countToRemove = 0;
            java.util.List<String> idsToRemove = new java.util.ArrayList<>();
            
            for (WebhookLog log : oldLogs) {
                if (currentCount <= maxLogCount && currentSize <= maxLogSizeBytes) {
                    break;
                }
                idsToRemove.add(log.getId());
                sizeToRemove += log.getBodySize();
                countToRemove++;
                
                currentCount--;
                currentSize -= log.getBodySize();
                currentSize = Math.max(0, currentSize);
            }
            
            if (!idsToRemove.isEmpty()) {
                mongoTemplate.remove(new Query(Criteria.where("_id").in(idsToRemove)), WebhookLog.class);
                Query query = Query.query(Criteria.where("endpointId").is(endpoint.getEndpointId()));
                Update update = new Update().inc("logCount", -countToRemove).inc("logSizeBytes", -sizeToRemove);
                mongoTemplate.updateFirst(query, update, Endpoint.class);
            }
            
            if (countToRemove == 0) {
                break;
            }
        }
    }
}
