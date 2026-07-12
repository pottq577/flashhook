package com.flashhook.domain.webhook.service.preset;

import com.flashhook.domain.webhook.dto.WebhookPayload;
import java.util.Map;

public interface RequestSigningPresetHandler {
    String getPresetType();

    WebhookPayload handleRequestGeneration(
        WebhookPayload payload,
        Map<String, Object> presetOptions
    );
}
