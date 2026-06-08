package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.service.WebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Void> receive(
            @PathVariable String endpointId,
            HttpServletRequest request) {
        webhookService.receive(endpointId, request);
        return ResponseEntity.ok().build();
    }
}
