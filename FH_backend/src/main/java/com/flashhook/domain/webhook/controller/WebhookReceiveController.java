package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.service.WebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.flashhook.domain.endpoint.model.MockConfig;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 웹훅 수신 컨트롤러
 * 모든 HTTP 메소드를 수용하여 웹훅 페이로드를 캡처
 */
@RestController
@RequestMapping("/api/hooks")
@RequiredArgsConstructor
public class WebhookReceiveController {

    private final WebhookService webhookService;

    /**
     * 웹훅 수신 (모든 HTTP 메소드 허용)
     */
    @RequestMapping(value = "/{endpointId}", method = {
            RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.HEAD
    })
    public CompletableFuture<ResponseEntity<?>> receive(
            @PathVariable String endpointId,
            HttpServletRequest request) {
        MockConfig mockConfig = webhookService.receive(endpointId, request);

        CompletableFuture<ResponseEntity<?>> future = new CompletableFuture<>();
        
        Runnable task = () -> {
            HttpHeaders headers = new HttpHeaders();
            if (mockConfig.getHeaders() != null) {
                mockConfig.getHeaders().forEach(headers::add);
            }
            if (headers.getContentType() == null) {
                headers.setContentType(MediaType.APPLICATION_JSON);
            }

            ResponseEntity<?> response = ResponseEntity
                    .status(mockConfig.getStatusCode())
                    .headers(headers)
                    .body(mockConfig.getBody());
            future.complete(response);
        };

        if (mockConfig.getDelayMs() > 0) {
            CompletableFuture.delayedExecutor(mockConfig.getDelayMs(), TimeUnit.MILLISECONDS).execute(task);
        } else {
            task.run();
        }

        return future;
    }
}
