package com.flashhook.domain.endpoint.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class MockConfig {
    @Builder.Default
    private int statusCode = 200;
    
    @Builder.Default
    private long delayMs = 0;
    
    @Builder.Default
    private Map<String, String> headers = new HashMap<>();
    
    @Builder.Default
    private String body = "ok";
}
