package com.flashhook.domain.webhook.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class HttpHeaderSanitizerTest {

    private final HttpHeaderSanitizer sanitizer = new HttpHeaderSanitizer();

    @Test
    @DisplayName("should only allow specific headers and sanitize values")
    void shouldOnlyAllowSpecificHeaders() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", "application/json");
        rawHeaders.put("x-mock-response", "test-value\u0000");
        rawHeaders.put("disallowed-header", "some-value");
        rawHeaders.put("Access-Control-Allow-Origin", "*");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getFirst("disallowed-header")).isNull();
        assertThat(headers.getFirst("content-type")).isEqualTo("application/json");
        assertThat(headers.getFirst("x-mock-response")).isEqualTo("test-value");
        assertThat(headers.getFirst("access-control-allow-origin")).isEqualTo("*");
    }

    @Test
    @DisplayName("should provide default text/plain content type if none exists")
    void shouldProvideDefaultContentType() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("x-mock-response", "test");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getContentType()).isEqualTo(MediaType.TEXT_PLAIN);
    }

    @Test
    @DisplayName("should validate and fallback invalid content-type")
    void shouldValidateAndFallbackInvalidContentType() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", "application/xml");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getFirst("content-type")).isEqualTo("text/plain");
    }

    @Test
    @DisplayName("should allow specific application/json subtypes")
    void shouldAllowSpecificJsonSubtypes() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", "application/hal+json; charset=UTF-8");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getFirst("content-type")).isEqualTo("application/hal+json; charset=UTF-8");
    }

    @Test
    @DisplayName("should preserve charset on content-type fallback")
    void shouldPreserveCharsetOnContentTypeFallback() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", "text/html; charset=UTF-8");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getFirst("content-type")).isEqualTo("text/plain; charset=UTF-8");
    }

    @Test
    @DisplayName("should handle null input")
    void shouldHandleNullInput() {
        assertThat(sanitizer.sanitize(null)).isNotNull();
    }

    @Test
    @DisplayName("should handle null header values")
    void shouldHandleNullValues() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", null);
        rawHeaders.put("x-mock-response", "val");
        
        HttpHeaders headers = sanitizer.sanitize(rawHeaders);
        assertThat(headers.getFirst("x-mock-response")).isEqualTo("val");
    }

    @Test
    @DisplayName("should fallback for unparsable content-type")
    void shouldFallbackForUnparsableContentType() {
        Map<String, String> rawHeaders = new HashMap<>();
        rawHeaders.put("content-type", "application/json; charset=");

        HttpHeaders headers = sanitizer.sanitize(rawHeaders);

        assertThat(headers.getFirst("content-type")).isEqualTo("text/plain");
    }
}
