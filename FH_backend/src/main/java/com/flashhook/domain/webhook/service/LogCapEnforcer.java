package com.flashhook.domain.webhook.service;

import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.global.config.FlashHookProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LogCapEnforcer {

    private final MongoTemplate mongoTemplate;
    private final FlashHookProperties properties;

    public void updateCountersAndEnforceCap(String endpointId, long bodySize) {
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update()
            .inc("logCount", 1)
            .inc("totalLogCount", 1)
            .inc("logSizeBytes", bodySize);
        
        Endpoint updatedEndpoint = mongoTemplate.findAndModify(
            query,
            update,
            FindAndModifyOptions.options().returnNew(true),
            Endpoint.class
        );

        if (updatedEndpoint != null) {
            java.util.concurrent.CompletableFuture.runAsync(() -> enforceLogCap(updatedEndpoint))
                .exceptionally(ex -> {
                    log.error("Failed to enforce log cap asynchronously for endpointId={}", endpointId, ex);
                    return null;
                });
        }
    }

    private void enforceLogCap(Endpoint endpoint) {
        long currentCount = endpoint.getLogCount();
        long currentSize = endpoint.getLogSizeBytes();

        while (
            currentCount > properties.log().maxCount() ||
            currentSize > properties.log().maxSizeBytes()
        ) {
            int fetchSize = (int) Math.max(
                currentCount - properties.log().maxCount(),
                50
            );
            if (fetchSize > 1000) fetchSize = 1000;

            Query findOldestQuery = new Query(
                Criteria.where("endpointId").is(endpoint.getEndpointId())
            )
                .with(Sort.by(Sort.Direction.ASC, "receivedAt"))
                .limit(fetchSize);
            findOldestQuery.fields().include("_id", "bodySize");

            List<WebhookLog> oldLogs = mongoTemplate.find(
                findOldestQuery,
                WebhookLog.class
            );

            if (oldLogs.isEmpty()) {
                break;
            }

            List<String> idsToRemove = new ArrayList<>();

            for (WebhookLog webhookLogItem : oldLogs) {
                if (
                    currentCount <= properties.log().maxCount() &&
                    currentSize <= properties.log().maxSizeBytes()
                ) {
                    break;
                }
                idsToRemove.add(webhookLogItem.getId());

                currentCount--;
                currentSize -= webhookLogItem.getBodySize();
                currentSize = Math.max(0, currentSize);
            }

            if (!idsToRemove.isEmpty()) {
                Query removeQuery = new Query(
                    new Criteria().andOperator(
                        Criteria.where("endpointId").is(
                            endpoint.getEndpointId()
                        ),
                        Criteria.where("_id").in(idsToRemove)
                    )
                );

                List<WebhookLog> removedLogs = mongoTemplate.findAllAndRemove(
                    removeQuery,
                    WebhookLog.class
                );
                if (removedLogs.isEmpty()) {
                    break;
                }

                long removedSize = removedLogs
                    .stream()
                    .mapToLong(l -> l.getBodySize())
                    .sum();
                int removedCount = removedLogs.size();

                Query query = Query.query(
                    Criteria.where("endpointId").is(endpoint.getEndpointId())
                );
                Update update = new Update()
                    .inc("logCount", -removedCount)
                    .inc("logSizeBytes", -removedSize);
                mongoTemplate.updateFirst(query, update, Endpoint.class);
                log.info(
                    "Enforced log cap for endpointId={}, removedCount={}, removedSize={}",
                    endpoint.getEndpointId(),
                    removedCount,
                    removedSize
                );
            }
        }
    }
}
