package com.flashhook.domain.webhook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.flashhook.domain.webhook.dto.PublicWebhookLogResponse;
import com.flashhook.domain.webhook.service.WebhookLogService;

import lombok.RequiredArgsConstructor;

/**
 * 퍼블릭 웹훅 로그 조회 컨트롤러 (Allow-list 마스킹 적용)
 */
@RestController
@RequestMapping("/api/public/logs")
@RequiredArgsConstructor
public class PublicWebhookLogController {

    private final WebhookLogService webhookLogService;

    /**
     * 공유용 퍼블릭 로그 상세 조회
     */
    @GetMapping("/{logId}")
    public ResponseEntity<PublicWebhookLogResponse> getPublicLogDetail(@PathVariable String logId) {
        PublicWebhookLogResponse response = webhookLogService.getPublicLogDetail(logId);
        return ResponseEntity.ok(response);
    }
}
