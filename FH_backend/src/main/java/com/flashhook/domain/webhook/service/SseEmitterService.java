package com.flashhook.domain.webhook.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@EnableScheduling
public class SseEmitterService {

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final Executor taskExecutor;
    private final MongoTemplate mongoTemplate;

    public SseEmitterService(@Qualifier("taskExecutor") Executor taskExecutor, MongoTemplate mongoTemplate) {
        this.taskExecutor = taskExecutor;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * SSE 구독 생성
     */
    public SseEmitter subscribe(String endpointId, long timeout) {
        SseEmitter emitter = new SseEmitter(timeout);

        emitters.computeIfAbsent(endpointId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(endpointId, emitter));
        emitter.onTimeout(() -> removeEmitter(endpointId, emitter));
        emitter.onError(e -> removeEmitter(endpointId, emitter));

        // 503 방지용 더미 데이터 전송
        try {
            emitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (IOException | IllegalStateException e) {
            log.error("SSE initial connect dummy data send failed for endpointId: {}", endpointId, e);
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
            WebhookLogResponse response = WebhookLogResponse.from(event.getWebhookLog());

            for (SseEmitter emitter : endpointEmitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("webhook")
                            .data(java.util.Objects.requireNonNull(response)));
                } catch (IOException | IllegalStateException e) {
                    log.error("Failed to send webhook log via SSE to endpointId: {}", endpointId, e);
                    try {
                        Query query = Query.query(Criteria.where("logId").is(event.getWebhookLog().getLogId()));
                        Update update = new Update()
                                .set("sseDeliveryStatus", "FAILED")
                                .set("sseError", e.getMessage());
                        mongoTemplate.updateFirst(query, update, WebhookLog.class);
                    } catch (DataAccessException persistEx) {
                        log.error("Failed to persist SSE failure status: logId={}", event.getWebhookLog().getLogId(),
                                persistEx);
                    } finally {
                        removeEmitter(endpointId, emitter);
                    }
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
                        emitter.send(SseEmitter.event().name("ping").data("heartbeat"));
                    } catch (IOException | IllegalStateException e) {
                        log.debug(
                                "Client disconnected or failed heartbeat ping. endpointId: {}, cause: {}: {}",
                                endpointId,
                                e.getClass().getSimpleName(),
                                e.getMessage()
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
        return emitters.values().stream()
                .mapToInt(List::size)
                .sum();
    }
}
