package com.flashhook.domain.endpoint.dto;

import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record MockUpdateRequest(
        @Min(100) @Max(599) Integer statusCode,

        @Min(0) @Max(10000) Long delayMs,

        @Size(max = 50) Map<String, String> headers,

        @Size(max = 65536) String body,

        @Size(max = 50) String presetType,

        Map<String, Object> presetOptions) {
}
