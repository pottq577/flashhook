package com.flashhook.domain.endpoint.model;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class MockConfig implements Serializable {
    private static final long serialVersionUID = 1L;
    @Builder.Default
    private final int statusCode = 200;

    @Builder.Default
    private final long delayMs = 0;

    private Map<String, String> headers;

    @Builder.Default
    private final String body = "ok";

    private String presetType;

    private Map<String, Object> presetOptions;

    public Map<String, String> getHeaders() {
        if (headers == null) {
            return new HashMap<>();
        }
        return headers;
    }

    public Map<String, Object> getPresetOptions() {
        if (presetOptions == null) {
            return new HashMap<>();
        }
        return presetOptions;
    }
}
