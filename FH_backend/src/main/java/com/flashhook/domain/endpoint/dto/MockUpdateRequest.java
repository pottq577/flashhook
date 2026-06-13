package com.flashhook.domain.endpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Getter
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
