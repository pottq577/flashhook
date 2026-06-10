package com.flashhook.domain.webhook.repository;

import com.flashhook.domain.webhook.model.WebhookLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * 웹훅 로그 리포지토리
 */
public interface WebhookLogRepository extends MongoRepository<WebhookLog, String> {

    Page<WebhookLog> findByEndpointId(String endpointId, Pageable pageable);

    Page<WebhookLog> findByEndpointIdAndReceivedAtLessThanOrderByReceivedAtDescLogIdDesc(String endpointId, java.time.Instant receivedAt, Pageable pageable);

    Page<WebhookLog> findByEndpointIdAndReceivedAtGreaterThanOrderByReceivedAtAscLogIdAsc(String endpointId, java.time.Instant receivedAt, Pageable pageable);

    Optional<WebhookLog> findByLogId(String logId);

    void deleteAllByEndpointId(String endpointId);

    Optional<WebhookLog> findFirstByEndpointIdOrderByReceivedAtAsc(String endpointId);

    long countByEndpointId(String endpointId);

    @org.springframework.data.mongodb.repository.Aggregation(pipeline = {
            "{ '$match': { 'endpointId': ?0 } }",
            "{ '$group': { '_id': null, 'total': { '$sum': '$bodySize' } } }"
    })
    Optional<Long> sumBodySizeByEndpointId(String endpointId);
}
