package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.service.WebhookService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

import com.flashhook.domain.endpoint.model.MockConfig;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.Set;

/**
 * 웹훅 수신 컨트롤러
 * 모든 HTTP 메소드를 수용하여 웹훅 페이로드를 캡처
 */
@RestController
@RequestMapping("/api/hooks")
public class WebhookReceiveController {

    private final WebhookService webhookService;
    private final ScheduledExecutorService scheduler;

    private static final Set<String> ALLOWED_HEADERS = Set.of(
        "content-type", "access-control-allow-origin", "cache-control", "x-mock-response"
    );

    public WebhookReceiveController(WebhookService webhookService) {
        this.webhookService = webhookService;
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

    /**
     * 웹훅 수신 (모든 HTTP 메소드 허용)
     */
    @RequestMapping(value = "/{endpointId}", method = {
            RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.HEAD
    })
    public DeferredResult<ResponseEntity<?>> receive(
            @PathVariable String endpointId,
            HttpServletRequest request) {
        MockConfig mockConfig = webhookService.receive(endpointId, request);

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
