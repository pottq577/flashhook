package com.flashhook.domain.webhook.controller;

import com.flashhook.domain.webhook.dto.IncomingWebhookPayload;
import com.flashhook.domain.webhook.service.MockResponseScheduler;
import com.flashhook.domain.webhook.service.WebhookService;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

/**
 * 웹훅 수신 컨트롤러
 * 모든 HTTP 메소드를 수용하여 웹훅 페이로드를 캡처
 */
@Slf4j
@RestController
@RequestMapping("/api/hooks")
public class WebhookReceiveController {

    private final WebhookService webhookService;
    private final MockResponseScheduler mockResponseScheduler;

    public WebhookReceiveController(WebhookService webhookService, MockResponseScheduler mockResponseScheduler) {
        this.webhookService = webhookService;
        this.mockResponseScheduler = mockResponseScheduler;
    }

    /**
     * 웹훅 수신 (모든 HTTP 메소드 허용)
     */
    @RequestMapping(value = "/{endpointId}", method = {
            RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.HEAD
    })
    public DeferredResult<ResponseEntity<?>> receive(
            @PathVariable String endpointId,
            HttpServletRequest request) {

        IncomingWebhookPayload payload = parseRequest(request);
        var mockConfig = webhookService.receive(endpointId, payload);

        return mockResponseScheduler.schedule(mockConfig, payload.getRawBody());
    }

    private IncomingWebhookPayload parseRequest(HttpServletRequest request) {
        String method = request.getMethod();
        String url = request.getRequestURL().toString()
                + (request.getQueryString() != null ? "?" + request.getQueryString() : "");
        String contentType = request.getContentType();
        String clientIp = request.getRemoteAddr();

        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames != null && headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            headers.put(name.toLowerCase(), request.getHeader(name));
        }

        Map<String, String> queryParams = new HashMap<>();
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            for (String param : queryString.split("&")) {
                String[] pair = param.split("=", 2);
                String key = decodeQueryComponent(pair[0]);
                String value = pair.length > 1 ? decodeQueryComponent(pair[1]) : "";
                queryParams.put(key, queryParams.containsKey(key) ? queryParams.get(key) + "," + value : value);
            }
        }

        long MAX_SIZE = 1024 * 1024;
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[8192];
        int nRead;
        long bodySize = 0;
        try (InputStream is = request.getInputStream()) {
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
                bodySize += nRead;
                if (bodySize > MAX_SIZE) {
                    throw new CustomException(ErrorCode.PAYLOAD_TOO_LARGE);
                }
            }
        } catch (IOException e) {
            log.error("웹훅 페이로드 수신 중 IOException 발생", e);
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }

        String rawBody = "";
        if (bodySize > 0) {
            rawBody = buffer.toString(StandardCharsets.UTF_8);
        }

        return IncomingWebhookPayload.builder()
                .method(method)
                .url(url)
                .contentType(contentType)
                .clientIp(clientIp)
                .headers(headers)
                .queryParams(queryParams)
                .rawBody(rawBody)
                .bodySize(bodySize)
                .build();
    }

    private String decodeQueryComponent(String value) {
        try {
            return java.net.URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            log.error("웹훅 수신 중 쿼리 파라미터 URL 디코딩 실패 (value: {})", value, e);
            return value;
        }
    }
}
