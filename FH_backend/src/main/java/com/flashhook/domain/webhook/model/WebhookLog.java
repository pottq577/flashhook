package com.flashhook.domain.webhook.model;

import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 웹훅 로그 도큐먼트 (MongoDB)
 * TTL: receivedAt 기준 24시간 후 자동 삭제
 */
@Document(collection = "logs")
@CompoundIndex(
    name = "idx_endpoint_received_logId",
    def = "{'endpointId': 1, 'receivedAt': -1, 'logId': -1}"
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLog {

    @Id
    private String id;

    @Indexed(unique = true)
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
