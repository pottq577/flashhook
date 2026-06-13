package com.flashhook.global.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import java.util.Collections;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;

/**
 * Rate Limit 서비스
 * Redis INCR + TTL 기반 슬라이딩 윈도우/고정 윈도우 제한
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    @Value("${flashhook.ratelimit.fail-open:true}")
    private boolean failOpen;

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
        if (key == null || key.isBlank() || limit <= 0 || windowSeconds <= 0) {
            return false;
        }

        try {
            DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
            redisScript.setScriptText(LUA_SCRIPT);
            redisScript.setResultType(Long.class);

            Long count = redisTemplate.execute(
                    java.util.Objects.requireNonNull(redisScript),
                    java.util.Objects.requireNonNull(Collections.singletonList(key)),
                    java.util.Objects.requireNonNull(String.valueOf(windowSeconds))
            );
            return count != null && count <= limit;
        } catch (Exception e) {
            log.warn("Rate limit Redis error. key={}", key, e);
            return failOpen;
        }
    }
}
