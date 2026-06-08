package com.flashhook.global.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Rate Limit 서비스
 * Redis INCR + TTL 기반 슬라이딩 윈도우/고정 윈도우 제한
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * 요청 허용 여부 판단
     *
     * @param key           제한 키 (예: "rl:create:{ip}", "rl:hook:{endpointId}")
     * @param limit         윈도우 내 최대 요청 수
     * @param windowSeconds 윈도우 크기 (초)
     * @return 허용 여부
     */
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        // TODO: 구현 필요
        return true;
    }
}
