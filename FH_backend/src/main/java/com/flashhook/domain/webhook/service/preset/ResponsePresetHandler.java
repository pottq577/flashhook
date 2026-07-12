package com.flashhook.domain.webhook.service.preset;

import com.flashhook.domain.endpoint.model.MockConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.DeferredResult;

public interface ResponsePresetHandler {
    String getPresetType();

    DeferredResult<ResponseEntity<?>> handleResponse(
        String rawBody,
        MockConfig mockConfig
    );
}
