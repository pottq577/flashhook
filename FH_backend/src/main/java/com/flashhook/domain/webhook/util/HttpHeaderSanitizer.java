package com.flashhook.domain.webhook.util;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class HttpHeaderSanitizer {

    private static final Set<String> ALLOWED_HEADERS = Set.of(
        "content-type",
        "access-control-allow-origin",
        "cache-control",
        "x-mock-response",
        "x-slack-no-retry",
        "x-flashhook-preset-status",
        "x-flashhook-report-url"
    );

    public HttpHeaders sanitize(Map<String, String> rawHeaders) {
        HttpHeaders headers = new HttpHeaders();
        if (rawHeaders != null) {
            rawHeaders.forEach((k, v) -> {
                if (k == null || v == null) return;
                if (ALLOWED_HEADERS.contains(k.toLowerCase())) {
                    String sanitizedValue = v.replaceAll(
                        "[\\x00-\\x1F\\x7F]",
                        ""
                    );
                    if ("content-type".equalsIgnoreCase(k)) {
                        String lowerValue = sanitizedValue.toLowerCase();
                        String mainType = lowerValue.split(";")[0].trim();
                        Set<String> allowedTypes = Set.of(
                            "application/json",
                            "text/plain"
                        );
                        boolean isAllowed =
                            allowedTypes.contains(mainType) ||
                            mainType.matches(
                                "^application/[a-z0-9.+-]+\\+json$"
                            );
                        if (!isAllowed) {
                            String charset = null;
                            if (lowerValue.contains("charset=")) {
                                int charsetIdx = lowerValue.indexOf("charset=");
                                String charsetPart = sanitizedValue.substring(
                                    charsetIdx
                                );
                                charset = charsetPart.split("[;\\s]")[0];
                            }
                            sanitizedValue =
                                charset != null
                                    ? "text/plain; " + charset
                                    : "text/plain";
                        }
                    }
                    headers.add(k, sanitizedValue);
                }
            });
        }

        if (headers.getContentType() == null) {
            headers.setContentType(MediaType.TEXT_PLAIN);
        }

        return headers;
    }
}
