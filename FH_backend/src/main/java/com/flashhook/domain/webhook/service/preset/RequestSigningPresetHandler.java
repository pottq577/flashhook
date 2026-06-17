package com.flashhook.domain.webhook.service.preset;

import java.util.Map;

import com.flashhook.domain.webhook.dto.WebhookPayload;

public interface RequestSigningPresetHandler {
    String getPresetType();

    WebhookPayload handleRequestGeneration(WebhookPayload payload, Map<String, Object> presetOptions);
}
