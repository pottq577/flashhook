package com.flashhook.domain.endpoint.model;

import java.io.Serializable;
import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Document(collection = "endpoints")
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class Endpoint implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    @Version
    private Long version;

    @Indexed(unique = true)
    private String endpointId;

    private String accessTokenHash;

    private String label;

    private String creatorIp;

    private int logCount;

    private int totalLogCount;

    private long logSizeBytes;

    @Indexed(expireAfter = "PT24H")
    private Instant createdAt;

    private Instant expiresAt;

    @Builder.Default
    private final MockConfig mockConfig = new MockConfig();

    public void incrementLogStats(long sizeBytes) {
        this.logCount += 1;
        this.totalLogCount += 1;
        this.logSizeBytes += sizeBytes;
    }

    public void decrementLogStats(long sizeBytes) {
        this.logCount = Math.max(0, this.logCount - 1);
        this.logSizeBytes = Math.max(0, this.logSizeBytes - sizeBytes);
    }
}
