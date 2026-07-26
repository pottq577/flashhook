package com.flashhook.domain.webhook.service;

import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.domain.webhook.util.WebhookPayloadProcessor;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.WebhookException;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WebhookPayloadProcessor webhookPayloadProcessor;
    private final LogCapEnforcer logCapEnforcer;
    private final MeterRegistry meterRegistry;

    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public MockConfig receive(
        String endpointId,
        IncomingWebhookPayload payload
    ) {
        Endpoint endpoint = endpointRepository
            .findByEndpointId(endpointId)
            .orElseThrow(() ->
                new WebhookException(ErrorCode.ENDPOINT_NOT_FOUND)
            );

        // 4. Object Body 및 Preview 생성
        WebhookPayloadProcessor.ProcessedPayload processedPayload = webhookPayloadProcessor.process(payload);

        // 5. Capped Collection 로직은 DB 저장 후 처리 (원자적 카운트 이후)

        // 6. DB 저장
        WebhookLog webhookLog = WebhookLog.builder()
            .logId(UUID.randomUUID().toString().replace("-", ""))
            .endpointId(endpointId)
            .method(payload.method())
            .url(payload.url())
            .headers(payload.headers())
            .queryParams(payload.queryParams())
            .body(processedPayload.bodyObj())
            .bodyPreview(processedPayload.bodyPreview())
            .contentType(payload.contentType())
            .clientIp(payload.clientIp())
            .bodySize(payload.bodySize())
            .receivedAt(Instant.now())
            .build();
        webhookLogRepository.save(Objects.requireNonNull(webhookLog));
        WebhookService.log.info(
            "Webhook received and saved: endpointId={}, logId={}, method={}, size={}",
            endpointId,
            webhookLog.getLogId(),
            payload.method(),
            payload.bodySize()
        );

        meterRegistry.counter("flashhook.webhook.received.total").increment();

        // 7. 엔드포인트 카운터 업데이트 (Atomic)
        logCapEnforcer.updateCountersAndEnforceCap(endpointId, payload.bodySize());

        // 8. 이벤트 발행 (SSE 전파용)
        eventPublisher.publishEvent(new WebhookReceivedEvent(webhookLog));

        return endpoint.getMockConfig() != null
            ? endpoint.getMockConfig()
            : MockConfig.builder().build();
    }
}
