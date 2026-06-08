package com.flashhook.domain.webhook.service;

import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.event.WebhookReceivedEvent;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.util.IpExtractor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Value("${flashhook.log.max-count:500}")
    private int maxLogCount;

    @Value("${flashhook.log.max-size-bytes:5242880}")
    private long maxLogSizeBytes;

    @Value("${flashhook.log.body-preview-length:300}")
    private int bodyPreviewLength;

    @Transactional
    public void receive(String endpointId, HttpServletRequest request) {
        // 1. 엔드포인트 확인
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        // 2. 요청 데이터 파싱
        String method = request.getMethod();
        String url = request.getRequestURL().toString() + (request.getQueryString() != null ? "?" + request.getQueryString() : "");
        String contentType = request.getContentType();
        String clientIp = IpExtractor.extract(request);

        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames != null && headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            headers.put(name.toLowerCase(), request.getHeader(name));
        }

        Map<String, String> queryParams = new HashMap<>();
        request.getParameterMap().forEach((k, v) -> queryParams.put(k, String.join(",", v)));

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
            // Ignore body read error
        }

        String rawBody = "";
        if (bodySize > 0) {
            rawBody = buffer.toString(StandardCharsets.UTF_8);
        }

        // 4. Object Body 및 Preview 생성
        Object bodyObj = rawBody;
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            try {
                bodyObj = objectMapper.readValue(rawBody, Object.class);
            } catch (Exception e) {
                // 파싱 실패 시 원본 문자열 유지
            }
        }
        
        String bodyPreview = rawBody.length() > bodyPreviewLength 
            ? rawBody.substring(0, bodyPreviewLength) 
            : rawBody;

        // 5. Capped Collection 로직 (오래된 로그 순환 삭제)
        enforceLogCap(endpoint, bodySize);

        // 6. DB 저장
        WebhookLog log = WebhookLog.builder()
                .logId(UUID.randomUUID().toString().replace("-", ""))
                .endpointId(endpointId)
                .method(method)
                .url(url)
                .headers(headers)
                .queryParams(queryParams)
                .body(bodyObj)
                .bodyPreview(bodyPreview)
                .contentType(contentType)
                .clientIp(clientIp)
                .bodySize(bodySize)
                .receivedAt(Instant.now())
                .build();
        webhookLogRepository.save(log);

        // 7. 엔드포인트 카운터 업데이트
        endpoint.incrementLogStats(bodySize);
        endpointRepository.save(endpoint);

        // 8. 이벤트 발행 (SSE 전파용)
        eventPublisher.publishEvent(new WebhookReceivedEvent(log));
    }

    private void enforceLogCap(Endpoint endpoint, long newBodySize) {
        while (endpoint.getLogCount() >= maxLogCount || (endpoint.getLogSizeBytes() + newBodySize) > maxLogSizeBytes) {
            // 가장 오래된 로그 찾아 삭제
            WebhookLog oldLog = webhookLogRepository.findFirstByEndpointIdOrderByReceivedAtAsc(endpoint.getEndpointId()).orElse(null);
            if (oldLog == null) {
                break;
            }
            webhookLogRepository.delete(oldLog);
            endpoint.decrementLogStats(oldLog.getBodySize());
            
            // 만약 로그가 비었는데도 용량이 초과라면 (newBodySize가 매우 큼) 루프 탈출
            if (endpoint.getLogCount() == 0) {
                break;
            }
        }
    }
}
