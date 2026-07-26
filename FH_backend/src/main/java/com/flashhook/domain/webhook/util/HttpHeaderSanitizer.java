package com.flashhook.domain.webhook.util;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.InvalidMediaTypeException;
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
                if (ALLOWED_HEADERS.contains(k.toLowerCase(Locale.ROOT))) {
                    String sanitizedValue = v.replaceAll(
                        "[\\x00-\\x1F\\x7F]",
                        ""
                    );
                    if ("content-type".equalsIgnoreCase(k)) {
                        String lowerValue = sanitizedValue.toLowerCase(Locale.ROOT);
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
                        
                        boolean isValid = isAllowed;
                        if (isValid) {
                            try {
                                MediaType.parseMediaType(sanitizedValue);
                            } catch (InvalidMediaTypeException e) {
                                isValid = false;
                            }
                        }

                        if (!isValid) {
                            String charset = null;
                            if (lowerValue.contains("charset=")) {
                                int charsetIdx = lowerValue.indexOf("charset=");
                                String charsetPart = sanitizedValue.substring(charsetIdx);
                                String[] parts = charsetPart.split("[;\\s]");
                                if (parts.length > 0 && parts[0].contains("=")) {
                                    String[] kv = parts[0].split("=");
                                    if (kv.length > 1 && !kv[1].isEmpty()) {
                                        charset = parts[0];
                                    }
                                }
                            }
                            sanitizedValue = (charset != null) ? "text/plain; " + charset : "text/plain";
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
