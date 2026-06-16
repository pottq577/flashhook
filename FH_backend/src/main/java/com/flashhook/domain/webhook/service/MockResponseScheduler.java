package com.flashhook.domain.webhook.service;

import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.async.DeferredResult;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashhook.domain.endpoint.model.MockConfig;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MockResponseScheduler {

    private final ScheduledExecutorService scheduler;
    private final ObjectMapper objectMapper;

    private static final Set<String> ALLOWED_HEADERS = Set.of(
            "content-type", "access-control-allow-origin", "cache-control", "x-mock-response");

    public MockResponseScheduler(ObjectMapper objectMapper) {
        this.scheduler = Executors.newScheduledThreadPool(Runtime.getRuntime().availableProcessors() * 2);
        this.objectMapper = objectMapper;
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            log.error("MockResponseScheduler shutdown interrupted", e);
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public DeferredResult<ResponseEntity<?>> schedule(MockConfig mockConfig, String rawBody) {
        if ("SLACK_URL_VERIFICATION".equals(mockConfig.getPresetType())) {
            DeferredResult<ResponseEntity<?>> slackResult = handleSlackUrlVerification(rawBody);
            if (slackResult != null) {
                return slackResult;
            }
        }

        DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L); // 15s timeout
        deferredResult.onTimeout(() -> deferredResult.setErrorResult(
                ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT)
                        .body("Mock response timeout")));

        Runnable task = () -> {
            try {
                int status = mockConfig.getStatusCode();
                if (status < 100 || status > 599) {
                    status = 200; // fallback
                }

                HttpHeaders headers = new HttpHeaders();
                if (mockConfig.getHeaders() != null) {
                    mockConfig.getHeaders().forEach((k, v) -> {
                        if (k == null || v == null)
                            return;
                        if (ALLOWED_HEADERS.contains(k.toLowerCase())) {
                            String sanitizedValue = v.replaceAll("[\\x00-\\x1F\\x7F]", "");
                            if ("content-type".equalsIgnoreCase(k)) {
                                String lowerValue = sanitizedValue.toLowerCase();
                                String mainType = lowerValue.split(";")[0].trim();
                                Set<String> allowedTypes = Set.of("application/json", "text/plain");
                                boolean isAllowed = allowedTypes.contains(mainType) ||
                                        mainType.matches("^application/[a-z0-9.+-]+\\+json$");
                                if (!isAllowed) {
                                    String charset = null;
                                    if (lowerValue.contains("charset=")) {
                                        int charsetIdx = lowerValue.indexOf("charset=");
                                        String charsetPart = sanitizedValue.substring(charsetIdx);
                                        charset = charsetPart.split("[;\\s]")[0];
                                    }
                                    sanitizedValue = charset != null ? "text/plain; " + charset : "text/plain";
                                }
                            }
                            headers.add(k, sanitizedValue);
                        }
                    });
                }

                if (headers.getContentType() == null) {
                    headers.setContentType(MediaType.TEXT_PLAIN);
                }

                ResponseEntity<?> response = ResponseEntity
                        .status(status)
                        .headers(headers)
                        .body(mockConfig.getBody());
                deferredResult.setResult(response);
            } catch (Exception e) {
                log.error("Internal Server Error processing mock response", e);
                deferredResult.setErrorResult(
                        ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Internal Server Error processing mock response"));
            }
        };

        if (mockConfig.getDelayMs() > 0) {
            scheduler.schedule(task, Math.min(mockConfig.getDelayMs(), 10000L), TimeUnit.MILLISECONDS);
        } else {
            task.run();
        }

        return deferredResult;
    }

    private DeferredResult<ResponseEntity<?>> handleSlackUrlVerification(String rawBody) {
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
        } catch (JsonProcessingException e) {
            log.error("Failed to parse Slack URL Verification payload", e);
            DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L);
            deferredResult.setResult(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());
            return deferredResult;
        }
    }
}
