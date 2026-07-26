package com.flashhook.domain.webhook.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.flashhook.domain.webhook.event.SseDeliveryFailedEvent;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class SseEmitterServiceTest {

    @Mock
    private Executor taskExecutor;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private SseEmitterService sseEmitterService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void whenSseSendFails_thenPublishesSseDeliveryFailedEvent() throws Exception {
        // Given
        String endpointId = "endpoint123";
        String logId = "log456";
        
        WebhookLog log = new WebhookLog();
        ReflectionTestUtils.setField(log, "logId", logId);
        ReflectionTestUtils.setField(log, "endpointId", endpointId);
        
        WebhookReceivedEvent event = new WebhookReceivedEvent(log);

        SseEmitter mockEmitter = mock(SseEmitter.class);
        doThrow(new IOException("Broken pipe")).when(mockEmitter).send(any(SseEmitter.SseEventBuilder.class));

        Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();
        List<SseEmitter> emitterList = new CopyOnWriteArrayList<>();
        emitterList.add(mockEmitter);
        emitters.put(endpointId, emitterList);

        ReflectionTestUtils.setField(sseEmitterService, "emitters", emitters);

        // When
        sseEmitterService.handleWebhookReceived(event);

        // Then
        ArgumentCaptor<SseDeliveryFailedEvent> captor = ArgumentCaptor.forClass(SseDeliveryFailedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        SseDeliveryFailedEvent publishedEvent = captor.getValue();
        assertThat(publishedEvent.logId()).isEqualTo(logId);
        assertThat(publishedEvent.errorMessage()).isEqualTo("Broken pipe");
    }
}
