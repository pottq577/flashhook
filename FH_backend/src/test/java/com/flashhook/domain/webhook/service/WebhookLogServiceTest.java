package com.flashhook.domain.webhook.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.event.SseDeliveryFailedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
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
}
