package com.flashhook.domain.webhook.dto;

import lombok.Builder;
import org.springframework.http.HttpHeaders;

@Builder(toBuilder = true)
public record WebhookPayload(String method, HttpHeaders headers, String body) {}
