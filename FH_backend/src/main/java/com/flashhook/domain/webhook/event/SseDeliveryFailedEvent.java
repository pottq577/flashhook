package com.flashhook.domain.webhook.event;

public record SseDeliveryFailedEvent(String logId, String errorMessage) {}
