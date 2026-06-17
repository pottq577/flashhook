package com.flashhook.domain.webhook.service.preset;

import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.DeferredResult;

import com.flashhook.domain.endpoint.model.MockConfig;

public interface ResponsePresetHandler {
    String getPresetType();

    DeferredResult<ResponseEntity<?>> handleResponse(String rawBody, MockConfig mockConfig);
}
