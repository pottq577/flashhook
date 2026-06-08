package com.flashhook.global.infrastructure.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Redis Pub/Sub 메시지 발행
 * 스케일아웃 시 다수 인스턴스 간 SSE 이벤트 동기화에 사용
 */
@Component
@RequiredArgsConstructor
public class RedisMessagePublisher {

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * 웹훅 로그를 Redis 채널로 발행
     */
    public void publish(String endpointId, String logJson) {
        // TODO: 스케일아웃 시 활성화
    }
}
