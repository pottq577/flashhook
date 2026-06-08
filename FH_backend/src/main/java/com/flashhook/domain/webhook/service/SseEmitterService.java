package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE(Server-Sent Events) 관리 서비스
 * 클라이언트 구독 및 웹훅 이벤트 전파 담당
 */
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;

@Service
@org.springframework.scheduling.annotation.EnableScheduling
public class SseEmitterService {

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

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
        } catch (IOException e) {
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
                            .data(response));
                } catch (IOException e) {
                    removeEmitter(endpointId, emitter);
                }
            }
        }
    }

    /**
     * Heartbeat 스케줄러 (연결 유지용 ping 전송)
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRateString = "${flashhook.sse.heartbeat-interval:30000}")
    public void sendHeartbeat() {
        emitters.forEach((endpointId, endpointEmitters) -> {
            for (SseEmitter emitter : endpointEmitters) {
                try {
                    emitter.send(SseEmitter.event().name("ping").data("heartbeat"));
                } catch (IOException e) {
                    removeEmitter(endpointId, emitter);
                }
            }
        });
    }

    private void removeEmitter(String endpointId, SseEmitter emitter) {
        List<SseEmitter> endpointEmitters = emitters.get(endpointId);
        if (endpointEmitters != null) {
            endpointEmitters.remove(emitter);
            if (endpointEmitters.isEmpty()) {
                emitters.remove(endpointId);
            }
        }
    }
}
