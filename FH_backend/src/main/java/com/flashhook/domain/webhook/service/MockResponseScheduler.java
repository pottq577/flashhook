package com.flashhook.domain.webhook.service;

import com.flashhook.domain.endpoint.model.MockConfig;
import com.flashhook.domain.webhook.service.preset.PresetHandlerRegistry;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.ErrorResponse;
import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.async.DeferredResult;

@Slf4j
@Component
public class MockResponseScheduler {

    private final ScheduledExecutorService scheduler;
    private final PresetHandlerRegistry presetHandlerRegistry;

    private static final Set<String> ALLOWED_HEADERS = Set.of(
        "content-type",
        "access-control-allow-origin",
        "cache-control",
        "x-mock-response",
        "x-slack-no-retry",
        "x-flashhook-preset-status",
        "x-flashhook-report-url"
    );

    public MockResponseScheduler(PresetHandlerRegistry presetHandlerRegistry) {
        this.scheduler = Executors.newScheduledThreadPool(
            Runtime.getRuntime().availableProcessors() * 2
        );
        this.presetHandlerRegistry = presetHandlerRegistry;
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
        } catch (Exception e) {
            log.error(
                "Unexpected error during MockResponseScheduler shutdown",
                e
            );
            scheduler.shutdownNow();
        }
    }

    public DeferredResult<ResponseEntity<?>> schedule(
        MockConfig mockConfig,
        String rawBody
    ) {
        if (mockConfig.getPresetType() != null) {
            DeferredResult<ResponseEntity<?>> presetResult =
                presetHandlerRegistry
                    .getResponseHandler(mockConfig.getPresetType())
                    .map(handler -> handler.handleResponse(rawBody, mockConfig))
                    .orElse(null);

            if (presetResult != null) {
                return presetResult;
            }
        }

        DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(
            15000L
        ); // 15s timeout
        deferredResult.onTimeout(() ->
            deferredResult.setErrorResult(
                ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).body(
                    "Mock response timeout"
                )
            )
        );

        Runnable task = () -> {
            try {
                int status = mockConfig.getStatusCode();
                if (status < 100 || status > 599) {
                    status = 200; // fallback
                }

                HttpHeaders headers = new HttpHeaders();
                if (mockConfig.getHeaders() != null) {
                    mockConfig.getHeaders().forEach((k, v) -> {
                        if (k == null || v == null) return;
                        if (ALLOWED_HEADERS.contains(k.toLowerCase())) {
                            String sanitizedValue = v.replaceAll(
                                "[\\x00-\\x1F\\x7F]",
                                ""
                            );
                            if ("content-type".equalsIgnoreCase(k)) {
                                String lowerValue =
                                    sanitizedValue.toLowerCase();
                                String mainType = lowerValue
                                    .split(";")[0]
                                    .trim();
                                Set<String> allowedTypes = Set.of(
                                    "application/json",
                                    "text/plain"
                                );
                                boolean isAllowed =
                                    allowedTypes.contains(mainType) ||
                                    mainType.matches(
                                        "^application/[a-z0-9.+-]+\\+json$"
                                    );
                                if (!isAllowed) {
                                    String charset = null;
                                    if (lowerValue.contains("charset=")) {
                                        int charsetIdx = lowerValue.indexOf(
                                            "charset="
                                        );
                                        String charsetPart =
                                            sanitizedValue.substring(
                                                charsetIdx
                                            );
                                        charset = charsetPart.split(
                                            "[;\\s]"
                                        )[0];
                                    }
                                    sanitizedValue =
                                        charset != null
                                            ? "text/plain; " + charset
                                            : "text/plain";
                                }
                            }
                            headers.add(k, sanitizedValue);
                        }
                    });
                }

                if (headers.getContentType() == null) {
                    headers.setContentType(MediaType.TEXT_PLAIN);
                }

                ResponseEntity<?> response = ResponseEntity.status(status)
                    .headers(headers)
                    .body(mockConfig.getBody());
                deferredResult.setResult(response);
            } catch (Exception e) {
                log.error("Internal Server Error processing mock response", e);
                deferredResult.setErrorResult(
                    ResponseEntity.status(
                        ErrorCode.INTERNAL_ERROR.getStatus()
                    ).body(
                        ErrorResponse.builder()
                            .code(ErrorCode.INTERNAL_ERROR.getCode())
                            .message(ErrorCode.INTERNAL_ERROR.getMessage())
                            .status(ErrorCode.INTERNAL_ERROR.getStatus())
                            .timestamp(Instant.now())
                            .build()
                    )
                );
            }
        };

        if (mockConfig.getDelayMs() > 0) {
            scheduler.schedule(
                task,
                Math.min(mockConfig.getDelayMs(), 10000L),
                TimeUnit.MILLISECONDS
            );
        } else {
            task.run();
        }

        return deferredResult;
    }
}
