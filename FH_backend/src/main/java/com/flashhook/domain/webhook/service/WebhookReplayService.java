package com.flashhook.domain.webhook.service;

import java.util.Objects;
import java.util.Optional;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.dto.WebhookPayload;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.domain.webhook.service.preset.PresetHandlerRegistry;
import com.flashhook.domain.webhook.service.preset.RequestSigningPresetHandler;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.WebhookException;
import com.flashhook.global.infrastructure.http.ReplayHttpClient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 웹훅 재전송 비즈니스 로직 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookReplayService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final MongoTemplate mongoTemplate;
    private final PresetHandlerRegistry presetHandlerRegistry;
    private final ObjectMapper objectMapper;
    private final ReplayHttpClient replayHttpClient;

    public void replayLog(String endpointId, String logId, String destinationUrl) {
        WebhookLog webhookLog = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new WebhookException(ErrorCode.LOG_NOT_FOUND));

        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new WebhookException(ErrorCode.ENDPOINT_NOT_FOUND));

        if (!webhookLog.getEndpointId().equals(endpointId)) {
            throw new WebhookException(ErrorCode.FORBIDDEN);
        }

        if (destinationUrl == null || webhookLog.getMethod() == null) {
            updateReplayStatus(logId, "FAILED", "Invalid webhook log: missing destinationUrl or method");
            throw new WebhookException(ErrorCode.INVALID_REQUEST);
        }

        String rawBody;
        Object storedBody = webhookLog.getBody();
        if (storedBody == null) {
            rawBody = "";
        } else if (storedBody instanceof String body) {
            rawBody = body;
        } else {
            try {
                rawBody = objectMapper.writeValueAsString(storedBody);
            } catch (JsonProcessingException e) {
                log.warn("웹훅 재전송 본문 직렬화 실패: logId={}", logId, e);
                updateReplayStatus(logId, "FAILED", "Failed to serialize replay body");
                throw new WebhookException(ErrorCode.INTERNAL_ERROR);
            }
        }

        HttpHeaders headers = new HttpHeaders();
        if (webhookLog.getHeaders() != null) {
            webhookLog.getHeaders().forEach(headers::add);
        }

        WebhookPayload payload = WebhookPayload.builder()
                .method(webhookLog.getMethod())
                .headers(headers)
                .body(rawBody)
                .build();

        try {
            if (endpoint.getMockConfig() != null && endpoint.getMockConfig().getPresetType() != null) {
                Optional<RequestSigningPresetHandler> handlerOpt = presetHandlerRegistry
                        .getRequestSigningHandler(endpoint.getMockConfig().getPresetType());
                if (handlerOpt.isPresent()) {
                    payload = Objects.requireNonNull(
                            handlerOpt.get().handleRequestGeneration(payload,
                                    endpoint.getMockConfig().getPresetOptions()),
                            "preset handler returned null");
                }
            }
        } catch (RuntimeException e) {
            log.warn("프리셋 서명 생성 실패: endpointId={}, logId={}", endpointId, logId, e);
            updateReplayStatus(logId, "FAILED", "Failed to generate preset signature");
            throw new WebhookException(ErrorCode.INTERNAL_ERROR);
        }

        try {
            replayHttpClient.sendRequest(destinationUrl, payload.getMethod(), payload.getHeaders(), payload.getBody());
            log.info("Webhook replayed successfully via WebhookReplayService: logId={}", logId);
            updateReplayStatus(logId, "SUCCESS", null);
        } catch (RestClientException e) {
            log.warn("웹훅 재전송 실패 via WebhookReplayService: logId={}", logId, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            updateReplayStatus(logId, "FAILED", errorMsg);
            throw new WebhookException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private void updateReplayStatus(String logId, String status, String errorMsg) {
        Query query = Query.query(Criteria.where("logId").is(logId));
        Update update = new Update().set("replayStatus", status);
        if (errorMsg != null) {
            update.set("replayError", errorMsg);
        } else {
            update.unset("replayError");
        }
        mongoTemplate.updateFirst(query, update, WebhookLog.class);
    }
}
