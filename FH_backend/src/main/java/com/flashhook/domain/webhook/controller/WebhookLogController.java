package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.dto.WebhookLogDetailResponse;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.service.WebhookLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 웹훅 로그 조회/삭제 컨트롤러
 */
@RestController
@RequestMapping("/api/endpoints/{endpointId}/logs")
@RequiredArgsConstructor
public class WebhookLogController {

    private final WebhookLogService webhookLogService;

    /**
     * 로그 목록 조회 (페이징)
     */
    @GetMapping
    public ResponseEntity<Page<WebhookLogResponse>> list(
            @PathVariable String endpointId,
            @RequestParam(required = false) String lastSeenId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "desc") String sort) {
        Page<WebhookLogResponse> response = webhookLogService.getLogs(endpointId, lastSeenId, page, size, sort);
        return ResponseEntity.ok(response);
    }

    /**
     * 로그 상세 조회
     */
    @GetMapping("/{logId}")
    public ResponseEntity<WebhookLogDetailResponse> detail(
            @PathVariable String endpointId,
            @PathVariable String logId) {
        WebhookLogDetailResponse response = webhookLogService.getLogDetail(endpointId, logId);
        return ResponseEntity.ok(response);
    }

    /**
     * 모든 로그 삭제
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteAll(@PathVariable String endpointId) {
        webhookLogService.deleteAll(endpointId);
        return ResponseEntity.noContent().build();
    }
}
