package com.flashhook.domain.webhook.util;

import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import com.flashhook.global.config.FlashHookProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookPayloadProcessor {

    private final ObjectMapper objectMapper;
    private final FlashHookProperties properties;

    public record ProcessedPayload(Object bodyObj, String bodyPreview) {}

    public ProcessedPayload process(IncomingWebhookPayload payload) {
        Object bodyObj = payload.rawBody();
        if (
            payload.contentType() != null &&
            payload.contentType().toLowerCase().contains("application/json")
        ) {
            try {
                bodyObj = objectMapper.readValue(
                    payload.rawBody(),
                    Object.class
                );
            } catch (JacksonException e) {
                log.debug("JSON 파싱 실패, 원본 문자열로 저장합니다.", e);
            } catch (Exception e) {
                log.error("JSON 파싱 중 예기치 않은 오류 발생", e);
            }
        }

        String bodyPreview = payload.rawBody();
        if (
            payload.rawBody() != null &&
            payload.rawBody().length() > properties.log().bodyPreviewLength()
        ) {
            int cutIndex = payload
                .rawBody()
                .offsetByCodePoints(
                    0,
                    Math.min(
                        payload
                            .rawBody()
                            .codePointCount(0, payload.rawBody().length()),
                        properties.log().bodyPreviewLength()
                    )
                );
            bodyPreview = payload.rawBody().substring(0, cutIndex);
        }

        return new ProcessedPayload(bodyObj, bodyPreview);
    }
}
