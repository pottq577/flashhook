package com.flashhook.domain.webhook.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.event.SseDeliveryFailedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.mongodb.client.result.UpdateResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class WebhookLogServiceTest {

    @Mock
    private WebhookLogRepository webhookLogRepository;

    @Mock
    private EndpointRepository endpointRepository;

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private WebhookLogService webhookLogService;

    @Test
    void whenHandleSseDeliveryFailed_thenUpdatesMongo() {
        // Given
        String logId = "log456";
        String errorMessage = "Broken pipe";
        SseDeliveryFailedEvent event = new SseDeliveryFailedEvent(logId, errorMessage);
        when(mongoTemplate.updateFirst(any(), any(), eq(WebhookLog.class)))
            .thenReturn(UpdateResult.acknowledged(1, 1L, null));

        // When
        webhookLogService.handleSseDeliveryFailed(event);

        // Then
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);

        verify(mongoTemplate).updateFirst(queryCaptor.capture(), updateCaptor.capture(), eq(WebhookLog.class));

        Query query = queryCaptor.getValue();
        Update update = updateCaptor.getValue();

        assertThat(query.getQueryObject().get("logId")).isEqualTo(logId);
        
        assertThat(update.getUpdateObject().get("$set")).isNotNull();
        org.bson.Document setDoc = (org.bson.Document) update.getUpdateObject().get("$set");
        assertThat(setDoc.get("sseDeliveryStatus")).isEqualTo("FAILED");
        assertThat(setDoc.get("sseError")).isEqualTo(errorMessage);
    }

    @Test
    void whenHandleSseDeliveryFailed_andNoLogFound_thenLogWarning(CapturedOutput output) {
        SseDeliveryFailedEvent event = new SseDeliveryFailedEvent("log123", "error");
        when(mongoTemplate.updateFirst(any(), any(), eq(WebhookLog.class)))
            .thenReturn(UpdateResult.acknowledged(0, 0L, null));

        webhookLogService.handleSseDeliveryFailed(event);

        assertThat(output.getOut()).contains("No WebhookLog found for SSE failure update: logId=log123");
    }

    @Test
    void whenHandleSseDeliveryFailed_andExceptionThrown_thenLogError(CapturedOutput output) {
        SseDeliveryFailedEvent event = new SseDeliveryFailedEvent("log123", "error");
        when(mongoTemplate.updateFirst(any(), any(), eq(WebhookLog.class)))
            .thenThrow(new DataAccessException("db error") {});

        webhookLogService.handleSseDeliveryFailed(event);

        assertThat(output.getOut()).contains("Failed to persist SSE failure status: logId=log123");
    }
}
