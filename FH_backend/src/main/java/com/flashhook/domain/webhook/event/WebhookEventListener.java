package com.flashhook.domain.webhook.event;

import com.flashhook.global.event.EndpointDeletedEvent;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class WebhookEventListener {

    private final WebhookLogRepository webhookLogRepository;

    @Async
    @EventListener
    @Transactional
    public void handleEndpointDeletedEvent(EndpointDeletedEvent event) {
        webhookLogRepository.deleteAllByEndpointId(event.endpointId());
    }
}
