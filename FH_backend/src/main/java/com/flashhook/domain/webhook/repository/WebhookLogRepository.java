package com.flashhook.domain.webhook.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.flashhook.domain.webhook.model.WebhookLog;

/**
 * 웹훅 로그 리포지토리
 */
public interface WebhookLogRepository extends MongoRepository<WebhookLog, String> {

    Page<WebhookLog> findByEndpointId(String endpointId, Pageable pageable);

    @Query("{ 'endpointId': ?0, '$or': [ { 'receivedAt': { '$lt': ?1 } }, { 'receivedAt': ?1, 'logId': { '$lt': ?2 } } ] }")
    Page<WebhookLog> findPreviousPage(String endpointId, Instant receivedAt, String logId, Pageable pageable);

    @Query("{ 'endpointId': ?0, '$or': [ { 'receivedAt': { '$gt': ?1 } }, { 'receivedAt': ?1, 'logId': { '$gt': ?2 } } ] }")
    Page<WebhookLog> findNextPage(String endpointId, Instant receivedAt, String logId, Pageable pageable);

    Optional<WebhookLog> findByLogId(String logId);

    void deleteAllByEndpointId(String endpointId);

    Optional<WebhookLog> findFirstByEndpointIdOrderByReceivedAtAsc(String endpointId);

    long countByEndpointId(String endpointId);

    @Aggregation(pipeline = {
            "{ '$match': { 'endpointId': ?0 } }",
            "{ '$group': { '_id': null, 'total': { '$sum': '$bodySize' } } }"
    })
    Optional<Long> sumBodySizeByEndpointId(String endpointId);
}
