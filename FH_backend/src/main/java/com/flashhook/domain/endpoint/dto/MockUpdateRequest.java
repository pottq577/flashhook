package com.flashhook.domain.endpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.jackson.Jacksonized;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Getter
@Builder
@Jacksonized
@NoArgsConstructor
@AllArgsConstructor
public class MockUpdateRequest {
    @Min(100)
    @Max(599)
    private Integer statusCode;

    @Min(0)
    @Max(10000)
    private Long delayMs;

    @Size(max = 50)
    private Map<String, String> headers;

    @Size(max = 65536)
    private String body;

    @Size(max = 50)
    private String presetType;
}
