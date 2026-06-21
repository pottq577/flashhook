package com.flashhook.domain.admin.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.flashhook.domain.admin.dto.AdminMetricsResponse;
import com.flashhook.domain.admin.dto.SuspiciousEndpointDto;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.service.EndpointService;
import com.flashhook.domain.webhook.service.SseEmitterService;
import com.flashhook.global.exception.AdminException;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.util.IpUtil;

import lombok.RequiredArgsConstructor;

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

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.group().sum("totalLogCount").as("totalWebhooks"));
        @SuppressWarnings("rawtypes")
        AggregationResults<Map> results = mongoTemplate.aggregate(agg, "endpoints", Map.class);
        long totalWebhooks = 0;
        Map<?, ?> resultMap = results.getUniqueMappedResult();
        if (resultMap != null && resultMap.containsKey("totalWebhooks")) {
            totalWebhooks = ((Number) resultMap.get("totalWebhooks")).longValue();
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
        String normalizedIp = normalizeIp(ip);
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + normalizedIp, "BLOCKED");
    }

    public void removeBlacklistIp(String ip) {
        String normalizedIp = normalizeIp(ip);
        redisTemplate.delete(BLACKLIST_PREFIX + normalizedIp);
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.trim().isEmpty()) {
            throw new AdminException(ErrorCode.INVALID_REQUEST);
        }
        return IpUtil.normalize(ip);
    }

    public List<String> getBlacklistedIps() {
        Set<String> keys = redisTemplate.execute((RedisCallback<Set<String>>) connection -> {
            Set<String> scanned = new HashSet<>();
            try (Cursor<byte[]> cursor = connection.keyCommands().scan(
                    ScanOptions.scanOptions()
                            .match(BLACKLIST_PREFIX + "*")
                            .build())) {
                while (cursor.hasNext()) {
                    scanned.add(new String(cursor.next(), StandardCharsets.UTF_8));
                }
            }
            return scanned;
        });
        if (keys == null || keys.isEmpty())
            return List.of();
        return keys.stream()
                .map(k -> k.replace(BLACKLIST_PREFIX, ""))
                .collect(Collectors.toList());
    }
}
