package com.flashhook.domain.webhook.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.global.config.FlashHookProperties;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.WebhookException;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MongoTemplate mongoTemplate;
    private final MeterRegistry meterRegistry;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FlashHookProperties properties;

    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public MockConfig receive(String endpointId, IncomingWebhookPayload payload) {
        // 1. 엔드포인트 확인
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new WebhookException(ErrorCode.ENDPOINT_NOT_FOUND));

        // 4. Object Body 및 Preview 생성
        Object bodyObj = payload.getRawBody();
        if (payload.getContentType() != null && payload.getContentType().toLowerCase().contains("application/json")) {
            try {
                bodyObj = objectMapper.readValue(payload.getRawBody(), Object.class);
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                log.debug("JSON 파싱 실패, 원본 문자열로 저장합니다.", e);
            } catch (Exception e) {
                log.error("JSON 파싱 중 예기치 않은 오류 발생", e);
            }
        }

        String bodyPreview = payload.getRawBody();
        if (payload.getRawBody() != null && payload.getRawBody().length() > properties.log().bodyPreviewLength()) {
            int cutIndex = payload.getRawBody().offsetByCodePoints(0,
                    Math.min(payload.getRawBody().codePointCount(0, payload.getRawBody().length()),
                            properties.log().bodyPreviewLength()));
            bodyPreview = payload.getRawBody().substring(0, cutIndex);
        }

        // 5. Capped Collection 로직은 DB 저장 후 처리 (원자적 카운트 이후)

        // 6. DB 저장
        WebhookLog webhookLog = WebhookLog.builder()
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
        webhookLogRepository.save(Objects.requireNonNull(webhookLog));
        WebhookService.log.info("Webhook received and saved: endpointId={}, logId={}, method={}, size={}", endpointId,
                webhookLog.getLogId(), payload.getMethod(), payload.getBodySize());

        meterRegistry.counter("flashhook.webhook.received.total").increment();

        // 7. 엔드포인트 카운터 업데이트 (Atomic)
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().inc("logCount", 1).inc("totalLogCount", 1).inc("logSizeBytes",
                payload.getBodySize());
        Endpoint updatedEndpoint = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                Endpoint.class);

        if (updatedEndpoint != null) {
            enforceLogCap(updatedEndpoint);
        }

        // 8. 이벤트 발행 (SSE 전파용)
        eventPublisher.publishEvent(new WebhookReceivedEvent(webhookLog));

        return endpoint.getMockConfig() != null ? endpoint.getMockConfig() : new MockConfig();
    }

    private void enforceLogCap(Endpoint endpoint) {
        long currentCount = endpoint.getLogCount();
        long currentSize = endpoint.getLogSizeBytes();

        while (currentCount > properties.log().maxCount() || currentSize > properties.log().maxSizeBytes()) {
            int fetchSize = (int) Math.max(currentCount - properties.log().maxCount(), 50);
            if (fetchSize > 1000)
                fetchSize = 1000;

            Query findOldestQuery = new Query(Criteria.where("endpointId").is(endpoint.getEndpointId()))
                    .with(Sort.by(Sort.Direction.ASC, "receivedAt"))
                    .limit(fetchSize);
            findOldestQuery.fields().include("_id").include("bodySize");

            List<WebhookLog> oldLogs = mongoTemplate.find(findOldestQuery, WebhookLog.class);

            if (oldLogs.isEmpty()) {
                break;
            }

            List<String> idsToRemove = new ArrayList<>();

            for (WebhookLog webhookLogItem : oldLogs) {
                if (currentCount <= properties.log().maxCount() && currentSize <= properties.log().maxSizeBytes()) {
                    break;
                }
                idsToRemove.add(webhookLogItem.getId());

                currentCount--;
                currentSize -= webhookLogItem.getBodySize();
                currentSize = Math.max(0, currentSize);
            }

            if (!idsToRemove.isEmpty()) {
                Query removeQuery = new Query(new Criteria().andOperator(
                        Criteria.where("endpointId").is(endpoint.getEndpointId()),
                        Criteria.where("_id").in(idsToRemove)));

                List<WebhookLog> removedLogs = mongoTemplate.findAllAndRemove(removeQuery, WebhookLog.class);
                if (removedLogs.isEmpty()) {
                    break;
                }

                long removedSize = removedLogs.stream().mapToLong(WebhookLog::getBodySize).sum();
                int removedCount = removedLogs.size();

                Query query = Query.query(Criteria.where("endpointId").is(endpoint.getEndpointId()));
                Update update = new Update().inc("logCount", -removedCount).inc("logSizeBytes", -removedSize);
                mongoTemplate.updateFirst(query, update, Endpoint.class);
                log.info("Enforced log cap for endpointId={}, removedCount={}, removedSize={}",
                        endpoint.getEndpointId(), removedCount, removedSize);
            }
        }
    }
}
