# FlashHook — DB 모델링

> MongoDB + Redis 데이터 설계
> 최종 수정: 2026-06-07

---

## 1. DB 구성 개요

| 저장소  | 역할                                        | 데이터 특성                   |
| ------- | ------------------------------------------- | ----------------------------- |
| MongoDB | 엔드포인트 메타 + 웹훅 로그                 | 영속(24h TTL), 비정형 Payload |
| Redis   | SSE 연결 관리, Rate Limit 카운터, 임시 캐시 | 휘발성, 빠른 읽기/쓰기        |

---

## 2. MongoDB Collections

### 2.1. endpoints

엔드포인트 메타데이터. 생성 시 1건 삽입, 24시간 후 TTL 자동 삭제.

```json
{
  "_id": ObjectId,
  "endpointId": "a1b2c3d4-5e6f-...",          // UUID v4 (공개용)
  "accessTokenHash": "sha256:e3b0c44...",      // SHA-256 해시 (원본 미저장)
  "label": "Toss 결제테스트",                    // optional, null 허용
  "creatorIp": "203.0.113.1",                   // 생성자 IP (Rate Limit 용)
  "logCount": 42,                               // 현재 로그 수 (앱 레벨 관리)
  "logSizeBytes": 128000,                       // 현재 로그 총 크기 (앱 레벨 관리)
  "version": 0,                                 // Optimistic Locking 필드
  "mockConfig": {                               // 응답 모의 설정
    "statusCode": 200,
    "delayMs": 0,
    "headers": {},
    "body": "ok"
  },
  "createdAt": ISODate("2026-06-07T22:35:00Z"), // TTL Index 기준 필드
  "expiresAt": ISODate("2026-06-08T22:35:00Z")  // FE 표시용
}
```

**인덱스:**

```javascript
// TTL Index — 24시간 후 자동 삭제
db.endpoints.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// 조회용
db.endpoints.createIndex({ endpointId: 1 }, { unique: true });

// IP 기반 활성 엔드포인트 수 조회용 (코드 미구현 상태, 향후 필요시 추가)
// db.endpoints.createIndex({ creatorIp: 1 });
```

### 2.2. logs

웹훅 수신 로그. 엔드포인트당 최대 500건 OR 5MB (앱 레벨 순환 덮어쓰기).

```json
{
  "_id": ObjectId,
  "logId": "log_abc123",
  "endpointId": "a1b2c3d4-5e6f-...",           // endpoints 참조 (JOIN 아님, 필터링용)
  "method": "POST",
  "url": "/api/hooks/a1b2c3d4-...?param=value",
  "headers": {                                   // 전체 헤더 원본
    "Content-Type": "application/json",
    "X-Custom-Header": "some-value",
    "User-Agent": "PaymentService/2.0"
  },
  "queryParams": {                               // 쿼리 파라미터 파싱 결과
    "param": "value"
  },
  "body": {                                      // 원본 Payload (비정형)
    "event": "payment.success",
    "amount": 50000
  },
  "bodyPreview": "{\"event\": \"payment.success\", \"amou...",  // 앞 300자 텍스트 절단
  "contentType": "application/json",
  "clientIp": "203.0.113.1",
  "bodySize": 256,                               // bytes
  "receivedAt": ISODate("2026-06-07T22:40:00Z")  // TTL Index 기준 필드
}
```

**인덱스:**

```javascript
// TTL Index — 24시간 후 자동 삭제
db.logs.createIndex({ receivedAt: 1 }, { expireAfterSeconds: 86400 });

// 엔드포인트별 로그 조회 (최신순 정렬)
db.logs.createIndex({ endpointId: 1, receivedAt: -1, logId: -1 }, { name: "idx_endpoint_received_logId" });

// 개별 로그 조회 (코드 미구현 상태, 향후 필요시 추가)
// db.logs.createIndex({ logId: 1 }, { unique: true });
```

---

## 3. Redis Key 설계

```
# Rate Limiting — Fixed Window Counter
rl:create:{ip}                      → INCR + EXPIRE 86400s (5개/IP/24시간)
rl:hook:{endpointId}:{ip}           → INCR + EXPIRE 60s  (100건/EP/IP/분)

# SSE 연결 관리
stream_token:{token}                → SET + EXPIRE 30s (SSE 연결용 일회용 토큰)
sse:connections:{ip}                → SET (동시 SSE 수 추적, 최대 5) (예정)

# IP당 활성 엔드포인트 수 (빠른 조회용 캐시)
endpoint:count:{ip}                 → INCR/DECR + TTL 없음 (MongoDB와 동기화)
```

---

## 4. 데이터 생명주기

```
[생성] → endpoints + Redis 카운터
  ↓
[수신] → logs 삽입 + 앱 레벨 캡 체크 (500건/5MB)
  ↓  초과 시 → 가장 오래된 로그 삭제 (순환 덮어쓰기)
  ↓
[24시간 경과] → MongoDB TTL Index가 endpoints, logs 자동 삭제
             → Redis 키는 자체 EXPIRE로 소멸
```

---

## 5. 앱 레벨 캡 적용 로직 (의사코드)

```java
void saveLog(WebhookLog log) {
    // 1. 용량 체크
    EndpointMeta meta = endpointRepository.findByEndpointId(log.getEndpointId());

    // 2. 500건 초과 OR 5MB 초과 → 가장 오래된 로그 삭제
    if (meta.getLogCount() >= 500 || meta.getLogSizeBytes() >= 5_242_880) {
        WebhookLog oldest = logRepository.findOldestByEndpointId(log.getEndpointId());
        logRepository.delete(oldest);
        meta.decrementLogCount();
        meta.subtractLogSize(oldest.getBodySize());
    }

    // 3. bodyPreview 생성 (앞 300자)
    log.setBodyPreview(truncate(log.getRawBody(), 300));

    // 4. 저장
    logRepository.save(log);
    meta.incrementLogCount();
    meta.addLogSize(log.getBodySize());
    endpointRepository.save(meta);
}
```
