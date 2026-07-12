package com.flashhook.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SSE 관련 설정값 바인딩
 * application.yaml의 flashhook.sse 프리픽스
 */
@Configuration
@ConfigurationProperties(prefix = "flashhook.sse")
@Getter
@Setter
public class SseConfig {

    /** SSE 최대 유지 시간 (ms) */
    private long timeout = 1800000;

    /** Heartbeat 전송 간격 (ms) */
    private long heartbeatInterval = 30000;
}
