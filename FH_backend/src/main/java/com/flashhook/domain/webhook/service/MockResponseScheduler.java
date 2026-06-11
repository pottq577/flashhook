package com.flashhook.domain.webhook.service;

import com.flashhook.domain.endpoint.model.MockConfig;
import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.async.DeferredResult;

import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class MockResponseScheduler {

    private final ScheduledExecutorService scheduler;

    private static final Set<String> ALLOWED_HEADERS = Set.of(
            "content-type", "access-control-allow-origin", "cache-control", "x-mock-response"
    );

    public MockResponseScheduler() {
        this.scheduler = Executors.newScheduledThreadPool(Runtime.getRuntime().availableProcessors() * 2);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public DeferredResult<ResponseEntity<?>> schedule(MockConfig mockConfig) {
        DeferredResult<ResponseEntity<?>> deferredResult = new DeferredResult<>(15000L); // 15s timeout
        deferredResult.onTimeout(() ->
                deferredResult.setErrorResult(
                        ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT)
                                .body("Mock response timeout")
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
                deferredResult.setErrorResult(
                        ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Internal Server Error processing mock response")
                );
            }
        };

        if (mockConfig.getDelayMs() > 0) {
            scheduler.schedule(task, Math.min(mockConfig.getDelayMs(), 10000L), TimeUnit.MILLISECONDS);
        } else {
            task.run();
        }

        return deferredResult;
    }
}
