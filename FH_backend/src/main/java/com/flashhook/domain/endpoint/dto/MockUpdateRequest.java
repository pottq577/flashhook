package com.flashhook.domain.endpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MockUpdateRequest {
    private Integer statusCode;
    
    @Min(0)
    @Max(10000)
    private Long delayMs;
    
    private Map<String, String> headers;
    
    private String body;
}
