package com.flashhook.domain.webhook.service.preset;

import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.async.DeferredResult;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.flashhook.domain.endpoint.model.MockConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlackPresetHandler implements ResponsePresetHandler {

    private final ObjectMapper objectMapper;

    @Override
    public String getPresetType() {
        return "SLACK_URL_VERIFICATION";
    }

    @Override
    public DeferredResult<ResponseEntity<?>> handleResponse(String rawBody, MockConfig mockConfig) {
        if (rawBody == null || rawBody.isEmpty()) {
            DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L);
            deferredResult.setResult(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());
            return deferredResult;
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);

            if (root.has("type") && "url_verification".equals(root.get("type").asText()) && root.has("challenge")) {
                String challenge = root.get("challenge").asText();
                Map<String, String> responseBody = Map.of("challenge", challenge);
                DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L);
                deferredResult.setResult(ResponseEntity.ok()
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .body(Objects.requireNonNull(objectMapper.writeValueAsString(responseBody))));
                return deferredResult;
            }
            return null;
        } catch (JacksonException e) {
            log.error("Failed to parse Slack URL Verification payload", e);
            DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L);
            deferredResult.setResult(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());
            return deferredResult;
        }
    }
}
