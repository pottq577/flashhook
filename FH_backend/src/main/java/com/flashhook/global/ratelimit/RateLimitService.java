package com.flashhook.global.ratelimit;

import java.util.Collections;
import java.util.Objects;

import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import com.flashhook.global.config.FlashHookProperties;
import com.flashhook.global.util.IpUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Rate Limit 서비스
 * Redis INCR + TTL 기반 슬라이딩 윈도우/고정 윈도우 제한
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    private final RedisTemplate<String, String> redisTemplate;
    private final FlashHookProperties properties;

    private static final String LUA_SCRIPT = "local current = redis.call('INCR', KEYS[1]) " +
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
                    Objects.requireNonNull(redisScript),
                    Objects.requireNonNull(Collections.singletonList(key)),
                    Objects.requireNonNull(String.valueOf(windowSeconds)));
            return count != null && count <= limit;
        } catch (DataAccessException e) {
            log.warn("Rate limit Redis error. key={}", key, e);
            return properties.ratelimit().failOpen();
        }
    }

    /**
     * IP 블랙리스트 여부 확인
     */
    public boolean isBlacklisted(String ip) {
        if (ip == null || ip.isBlank())
            return false;
        try {
            String normalizedIp = IpUtil.normalize(ip);
            return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:ip:" + normalizedIp));
        } catch (DataAccessException e) {
            log.warn("Blacklist Redis check error. ip={}", ip, e);
            return !properties.ratelimit().blacklistFailOpen();
        }
    }
}
