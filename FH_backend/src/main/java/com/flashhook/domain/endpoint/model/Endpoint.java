package com.flashhook.domain.endpoint.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * 엔드포인트 도큐먼트 (MongoDB)
 * TTL: createdAt 기준 24시간 후 자동 삭제
 */
@Document(collection = "endpoints")
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class Endpoint {

    @Id
    private String id;

    private String endpointId;

    private String accessTokenHash;

    private String label;

    private String creatorIp;

    private int logCount;

    private long logSizeBytes;

    @Indexed(expireAfter = "PT24H")
    private Instant createdAt;

    private Instant expiresAt;

    public void incrementLogStats(long sizeBytes) {
        this.logCount += 1;
        this.logSizeBytes += sizeBytes;
    }

    public void decrementLogStats(long sizeBytes) {
        this.logCount = Math.max(0, this.logCount - 1);
        this.logSizeBytes = Math.max(0, this.logSizeBytes - sizeBytes);
    }
}
