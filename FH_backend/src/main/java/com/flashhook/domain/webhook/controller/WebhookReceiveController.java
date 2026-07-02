package com.flashhook.domain.webhook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.DeferredResult;

import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import com.flashhook.domain.webhook.service.MockResponseScheduler;
import com.flashhook.domain.webhook.service.WebhookService;
import com.flashhook.domain.webhook.util.WebhookPayloadParser;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 웹훅 수신 컨트롤러
 * 모든 HTTP 메소드를 수용하여 웹훅 페이로드를 캡처
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/hooks")
public class WebhookReceiveController {

    private final WebhookService webhookService;
    private final MockResponseScheduler mockResponseScheduler;
    private final WebhookPayloadParser payloadParser;

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

        IncomingWebhookPayload payload = payloadParser.parse(request);
        var mockConfig = webhookService.receive(endpointId, payload);

        return mockResponseScheduler.schedule(mockConfig, payload.rawBody());
    }
}
