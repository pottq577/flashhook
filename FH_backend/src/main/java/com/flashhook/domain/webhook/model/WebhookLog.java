package com.flashhook.domain.webhook.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.mongodb.core.index.CompoundIndex;

/**
 * 웹훅 로그 도큐먼트 (MongoDB)
 * TTL: receivedAt 기준 24시간 후 자동 삭제
 */
@Document(collection = "logs")
@CompoundIndex(name = "idx_endpoint_received_logId", def = "{'endpointId': 1, 'receivedAt': -1, 'logId': -1}")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLog {

    @Id
    private String id;

    private String logId;

    private String endpointId;

    private String method;

    private String url;

    private Map<String, String> headers;

    private Map<String, String> queryParams;

    private Object body;

    private String bodyPreview;

    private String contentType;

    private String clientIp;

    private long bodySize;

    @Indexed(expireAfter = "PT24H")
    private Instant receivedAt;
}
