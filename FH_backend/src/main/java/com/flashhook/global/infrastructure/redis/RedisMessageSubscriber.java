package com.flashhook.global.infrastructure.redis;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * Redis Pub/Sub 메시지 구독
 * 스케일아웃 시 다른 인스턴스에서 발행된 이벤트를 수신
 */
@Component
public class RedisMessageSubscriber implements MessageListener {

    @Override
    public void onMessage(Message message, byte[] pattern) {
        // TODO: 스케일아웃 시 활성화
    }
}
