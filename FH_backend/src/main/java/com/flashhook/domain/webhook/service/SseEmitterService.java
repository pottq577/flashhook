package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicLong;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import com.flashhook.domain.webhook.event.SseDeliveryFailedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@EnableScheduling
public class SseEmitterService {

    private final Map<String, List<SseEmitter>> emitters =
        new ConcurrentHashMap<>();
    @Getter
    private final AtomicLong sseDeliveryFailures = new AtomicLong(0);
    private final Executor taskExecutor;
    private final ApplicationEventPublisher eventPublisher;

    public SseEmitterService(
        @Qualifier("taskExecutor") Executor taskExecutor,
        ApplicationEventPublisher eventPublisher
    ) {
        this.taskExecutor = taskExecutor;
        this.eventPublisher = eventPublisher;
    }

    /**
     * SSE 구독 생성
     */
    public SseEmitter subscribe(String endpointId, long timeout) {
        SseEmitter emitter = new SseEmitter(timeout);

        emitters
            .computeIfAbsent(endpointId, k -> new CopyOnWriteArrayList<>())
            .add(emitter);

        emitter.onCompletion(() -> removeEmitter(endpointId, emitter));
        emitter.onTimeout(() -> removeEmitter(endpointId, emitter));
        emitter.onError(e -> removeEmitter(endpointId, emitter));

        // 503 방지용 더미 데이터 전송
        try {
            emitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (IOException | IllegalStateException e) {
            log.debug(
                "SSE initial connect dummy data send failed for endpointId: {}, cause: {}",
                endpointId,
                e.getMessage()
            );
            removeEmitter(endpointId, emitter);
        } catch (Exception e) {
            log.error(
                "Unexpected error during SSE initial connect for endpointId: {}",
                endpointId,
                e
            );
            removeEmitter(endpointId, emitter);
        }

        return emitter;
    }

    /**
     * 웹훅 수신 이벤트 처리 → SSE 전파
     */
    @Async
    @EventListener
    public void handleWebhookReceived(WebhookReceivedEvent event) {
        String endpointId = event.getWebhookLog().getEndpointId();
        List<SseEmitter> endpointEmitters = emitters.get(endpointId);

        if (endpointEmitters != null && !endpointEmitters.isEmpty()) {
            WebhookLogResponse response = WebhookLogResponse.from(
                event.getWebhookLog()
            );

            for (SseEmitter emitter : endpointEmitters) {
                try {
                    emitter.send(
                        SseEmitter.event()
                            .name("webhook")
                            .data(java.util.Objects.requireNonNull(response))
                    );
                } catch (IOException | IllegalStateException e) {
                    log.info(
                        "Failed to send webhook log via SSE to endpointId: {} - {}",
                        endpointId,
                        e.getMessage()
                    );
                    sseDeliveryFailures.incrementAndGet();
                    try {
                        eventPublisher.publishEvent(
                            new SseDeliveryFailedEvent(
                                event.getWebhookLog().getLogId(),
                                e.getMessage()
                            )
                        );
                    } catch (Exception publishEx) {
                        log.error(
                            "Failed to publish SSE failure event: logId={}",
                            event.getWebhookLog().getLogId(),
                            publishEx
                        );
                    } finally {
                        removeEmitter(endpointId, emitter);
                    }
                } catch (Exception e) {
                    log.error(
                        "Unexpected error while sending webhook log via SSE to endpointId: {}",
                        endpointId,
                        e
                    );
                    removeEmitter(endpointId, emitter);
                }
            }
        }
    }

    /**
     * Heartbeat 스케줄러 (연결 유지용 ping 전송)
     */
    @Scheduled(fixedRateString = "${flashhook.sse.heartbeat-interval:30000}")
    public void sendHeartbeat() {
        emitters.forEach((endpointId, endpointEmitters) -> {
            for (SseEmitter emitter : endpointEmitters) {
                CompletableFuture.runAsync(() -> {
                    try {
                        emitter.send(
                            SseEmitter.event().name("ping").data("heartbeat")
                        );
                    } catch (IOException | IllegalStateException e) {
                        log.debug(
                            "Client disconnected or failed heartbeat ping. endpointId: {}, cause: {}: {}",
                            endpointId,
                            e.getClass().getSimpleName(),
                            e.getMessage()
                        );
                        removeEmitter(endpointId, emitter);
                    } catch (Exception e) {
                        log.error(
                            "Unexpected error during heartbeat ping for endpointId: {}",
                            endpointId,
                            e
                        );
                        removeEmitter(endpointId, emitter);
                    }
                }, taskExecutor);
            }
        });
    }

    private void removeEmitter(String endpointId, SseEmitter emitter) {
        emitters.computeIfPresent(endpointId, (key, endpointEmitters) -> {
            endpointEmitters.remove(emitter);
            return endpointEmitters.isEmpty() ? null : endpointEmitters;
        });
    }

    /**
     * 현재 활성화된 SSE 연결 총 개수 반환
     */
    public int getActiveConnectionCount() {
        return emitters
            .values()
            .stream()
            .mapToInt(l -> l.size())
            .sum();
    }
}
