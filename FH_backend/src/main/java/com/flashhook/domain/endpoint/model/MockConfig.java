package com.flashhook.domain.endpoint.model;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder(toBuilder = true)

public class MockConfig implements Serializable {
    private static final long serialVersionUID = 1L;

    @Builder.Default
    private final int statusCode = 200;

    @Builder.Default
    private final long delayMs = 0;

    private final Map<String, String> headers;

    @Builder.Default
    private final String body = "ok";

    private final String presetType;

    private final Map<String, Object> presetOptions;

    @org.springframework.data.annotation.PersistenceCreator
    @com.fasterxml.jackson.annotation.JsonCreator
    public MockConfig(
            @JsonProperty("statusCode") Integer statusCode,
            @JsonProperty("delayMs") Long delayMs,
            @JsonProperty("headers") Map<String, String> headers,
            @JsonProperty("body") String body,
            @JsonProperty("presetType") String presetType,
            @JsonProperty("presetOptions") Map<String, Object> presetOptions) {
        this.statusCode = (statusCode != null && statusCode != 0) ? statusCode : 200;
        this.delayMs = (delayMs != null) ? delayMs : 0L;
        this.headers = headers;
        this.body = (body != null) ? body : "ok";
        this.presetType = presetType;
        this.presetOptions = presetOptions;
    }

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
