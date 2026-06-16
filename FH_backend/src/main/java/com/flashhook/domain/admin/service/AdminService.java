package com.flashhook.domain.admin.service;

import com.flashhook.domain.admin.dto.AdminMetricsResponse;
import com.flashhook.domain.admin.dto.SuspiciousEndpointDto;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.service.EndpointService;
import com.flashhook.domain.webhook.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final MongoTemplate mongoTemplate;
    private final SseEmitterService sseEmitterService;
    private final EndpointService endpointService;
    private final StringRedisTemplate redisTemplate;

    private static final String BLACKLIST_PREFIX = "blacklist:ip:";

    public AdminMetricsResponse getMetrics() {
        // 오늘 생성된 엔드포인트 수
        Instant startOfDay = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .toLocalDate().atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant();
        
        Query countQuery = new Query();
        countQuery.addCriteria(Criteria.where("createdAt").gte(startOfDay));
        long endpointsToday = mongoTemplate.count(countQuery, Endpoint.class);

        // 누적 웹훅 수
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.group().sum("logCount").as("totalWebhooks")
        );
        AggregationResults<Map> results = mongoTemplate.aggregate(agg, "endpoints", Map.class);
        long totalWebhooks = 0;
        if (results.getUniqueMappedResult() != null && results.getUniqueMappedResult().containsKey("totalWebhooks")) {
            totalWebhooks = ((Number) results.getUniqueMappedResult().get("totalWebhooks")).longValue();
        }

        return AdminMetricsResponse.builder()
                .endpointsCreatedToday(endpointsToday)
                .totalWebhooksReceived(totalWebhooks)
                .activeSseConnections(sseEmitterService.getActiveConnectionCount())
                .build();
    }

    public List<SuspiciousEndpointDto> getSuspiciousEndpoints() {
        Query query = new Query();
        query.with(Sort.by(Sort.Direction.DESC, "logCount"));
        query.limit(10);
        
        List<Endpoint> endpoints = mongoTemplate.find(query, Endpoint.class);
        return endpoints.stream().map(e -> SuspiciousEndpointDto.builder()
                .endpointId(e.getEndpointId())
                .creatorIp(e.getCreatorIp())
                .logCount(e.getLogCount())
                .logSizeBytes(e.getLogSizeBytes())
                .createdAt(e.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    public void deleteEndpoint(String endpointId) {
        endpointService.delete(endpointId);
    }

    public void blacklistIp(String ip) {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + ip, "BLOCKED");
    }

    public void removeBlacklistIp(String ip) {
        redisTemplate.delete(BLACKLIST_PREFIX + ip);
    }

    public List<String> getBlacklistedIps() {
        Set<String> keys = redisTemplate.keys(BLACKLIST_PREFIX + "*");
        if (keys == null || keys.isEmpty()) return List.of();
        return keys.stream()
                .map(k -> k.replace(BLACKLIST_PREFIX, ""))
                .collect(Collectors.toList());
    }
}
