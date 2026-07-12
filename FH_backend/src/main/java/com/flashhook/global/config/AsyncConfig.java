package com.flashhook.global.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.jvm.ExecutorServiceMetrics;
import java.util.List;
import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 비동기 처리 설정
 * SSE 이벤트 전파 등에서 사용
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor(MeterRegistry meterRegistry) {
        Counter rejectedCounter = Counter.builder("executor.rejected.tasks")
            .tag("name", "taskExecutor")
            .description(
                "taskExecutor가 큐 포화로 거부한 작업 수 (SSE 이벤트 유실 지표)"
            )
            .register(meterRegistry);

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler((runnable, exec) -> {
            rejectedCounter.increment();
            throw new TaskRejectedException(
                "Executor [taskExecutor] queue is full — task rejected"
            );
        });
        executor.initialize();
        // Prometheus에 executor_* 지표 노출 (completed/active/queued/pool_size 등)
        ExecutorServiceMetrics.monitor(
            meterRegistry,
            executor.getThreadPoolExecutor(),
            "taskExecutor",
            List.of()
        );
        return executor;
    }
}
