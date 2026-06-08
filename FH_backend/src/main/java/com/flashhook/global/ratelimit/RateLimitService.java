package com.flashhook.global.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import java.util.Collections;

/**
 * Rate Limit 서비스
 * Redis INCR + TTL 기반 슬라이딩 윈도우/고정 윈도우 제한
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisTemplate<String, String> redisTemplate;

    private static final String LUA_SCRIPT = 
            "local current = redis.call('INCR', KEYS[1]) " +
            "if current == 1 then " +
            "    redis.call('EXPIRE', KEYS[1], ARGV[1]) " +
            "end " +
            "return current";

    /**
     * 요청 허용 여부 판단
     *
     * @param key           제한 키 (예: "rl:create:{ip}", "rl:hook:{endpointId}:{ip}")
     * @param limit         윈도우 내 최대 요청 수
     * @param windowSeconds 윈도우 크기 (초)
     * @return 허용 여부
     */
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        try {
            DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
            redisScript.setScriptText(LUA_SCRIPT);
            redisScript.setResultType(Long.class);

            Long count = redisTemplate.execute(redisScript, Collections.singletonList(key), String.valueOf(windowSeconds));
            return count != null && count <= limit;
        } catch (Exception e) {
            // Redis 에러 발생 시 fail-open (허용) 정책 적용
            return true;
        }
    }
}
