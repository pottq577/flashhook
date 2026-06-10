# FlashHook — MVP API 명세서

> Webhook Catcher (Phase 1) 전체 엔드포인트
> 최종 수정: 2026-06-07

---

## 1. 공통 사항

### 1.1. Base URL

```
https://flashhook.kr/api
```

### 1.2. 인증 방식

```
REST API  → Header: X-Access-Token: {accessToken}
SSE 스트림 → Query:  ?token={accessToken}
```

### 1.3. 공통 에러 응답 형식

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 메시지",
    "status": 400,
    "timestamp": "2026-06-07T22:40:00Z",
    "path": "/api/endpoints"
  }
}
```

### 1.4. 에러 코드 목록

| HTTP Status | Code                      | 설명                      |
| :---------: | ------------------------- | ------------------------- |
|     403     | `INVALID_TOKEN`           | 토큰 없음 또는 불일치     |
|     404     | `ENDPOINT_NOT_FOUND`      | 엔드포인트 없음 또는 만료 |
|     413     | `PAYLOAD_TOO_LARGE`       | 요청 Body 1MB 초과        |
|     429     | `RATE_LIMIT_EXCEEDED`     | Rate Limit 초과           |
|     429     | `ENDPOINT_LIMIT_EXCEEDED` | IP당 엔드포인트 수 초과   |
|     500     | `INTERNAL_ERROR`          | 서버 내부 에러            |

---

## 2. 엔드포인트 관리

### 2.1. 엔드포인트 생성

```
POST /api/endpoints
```

**인증**: 없음 (IP 기반 Rate Limit)

**Request**:

```
Content-Type: application/json (선택)

// Body 없음 or {} → label 없이 생성
// Body 있으면:
{
  "label": "Toss 결제테스트"     // optional
}
```

**Response**: `201 Created`

```json
{
  "endpointId": "a1b2c3d4-5e6f-...",
  "accessToken": "xK9mQ2vL...",
  "label": "Toss 결제테스트",
  "webhookUrl": "https://flashhook.kr/api/hooks/a1b2c3d4-5e6f-...",
  "dashboardUrl": "https://flashhook.kr/dashboard/a1b2c3d4-5e6f-...",
  "expiresAt": "2026-06-08T22:35:00Z",
  "limits": {
    "maxLogs": 500,
    "maxSizeMb": 5
  },
  "mockConfig": {
    "statusCode": 200,
    "delayMs": 0,
    "headers": {},
    "body": "ok"
  }
}
```

> `accessToken`은 이 응답에서만 원본 반환. 이후 서버에 해시로만 존재.

**에러**:

- `429 RATE_LIMIT_EXCEEDED`: 5개/IP/10분 초과
- `429 ENDPOINT_LIMIT_EXCEEDED`: IP당 동시 10개 초과

---

### 2.2. 엔드포인트 정보 조회

```
GET /api/endpoints/{endpointId}
```

**인증**: `X-Access-Token` 헤더

**Response**: `200 OK`

```json
{
  "endpointId": "a1b2c3d4-...",
  "label": "Toss 결제테스트",
  "webhookUrl": "https://flashhook.kr/api/hooks/a1b2c3d4-...",
  "dashboardUrl": "https://flashhook.kr/dashboard/a1b2c3d4-...",
  "createdAt": "2026-06-07T22:35:00Z",
  "expiresAt": "2026-06-08T22:35:00Z",
  "limits": {
    "maxLogs": 500,
    "maxSizeMb": 5
  },
  "mockConfig": {
    "statusCode": 200,
    "delayMs": 0,
    "headers": {},
    "body": "ok"
  }
}
```

---

### 2.3. 엔드포인트 삭제

```
DELETE /api/endpoints/{endpointId}
```

**인증**: `X-Access-Token` 헤더

**Response**: `204 No Content`

> 엔드포인트 + 관련 로그 전부 즉시 삭제.

---

### 2.4. 모의 응답(Mock) 설정 업데이트

```
PATCH /api/endpoints/{endpointId}/mock
```

**인증**: `X-Access-Token` 헤더

**Request**:

```json
{
  "statusCode": 400,
  "delayMs": 5000,
  "headers": {
    "Content-Type": "application/json",
    "X-Custom-Header": "FlashHook"
  },
  "body": "{\"error\": \"Bad Request\"}"
}
```

**Response**: `200 OK` (업데이트된 엔드포인트 정보 반환)

---

## 3. 웹훅 수신

### 3.1. 웹훅 수신 (외부 서비스 호출)

```
ANY /api/hooks/{endpointId}
```

**인증**: 없음 (외부 서비스가 호출하므로 인증 불가)

**허용 메소드**: GET, POST, PUT, PATCH, DELETE 등 전부

**캡처 대상**:

- HTTP Method
- Headers (전체)
- Body (raw)
- Query Parameters
- Content-Type
- Client IP
- 수신 시각

**Response**: `200 OK`

```json
{
  "message": "Received",
  "logId": "log_abc123"
}
```

**에러**:

- `404 ENDPOINT_NOT_FOUND`: 존재하지 않거나 만료된 엔드포인트
- `413 PAYLOAD_TOO_LARGE`: Body 1MB 초과
- `429 RATE_LIMIT_EXCEEDED`: 100건/EP/분 초과

---

## 4. 로그 조회

### 4.1. 로그 목록 조회

```
GET /api/endpoints/{endpointId}/logs
```

**인증**: `X-Access-Token` 헤더

**Query Parameters**:

| 파라미터 | 타입   | 기본값 | 설명                               |
| -------- | ------ | ------ | ---------------------------------- |
| `page`   | int    | 1      | 페이지 번호                        |
| `size`   | int    | 20     | 페이지 크기 (최대 100)             |
| `sort`   | string | desc   | 정렬 (desc: 최신순, asc: 오래된순) |

**Response**: `200 OK`

```json
{
  "logs": [
    {
      "logId": "log_abc123",
      "method": "POST",
      "contentType": "application/json",
      "clientIp": "203.0.113.1",
      "bodyPreview": "{\"event\": \"payment.success\", \"amou...",
      "bodySize": 256,
      "receivedAt": "2026-06-07T22:40:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "totalCount": 42,
    "totalPages": 3
  }
}
```

> `bodyPreview`: Body 앞 300자 텍스트 절단. 저장 시점에 BE에서 생성.

---

### 4.2. 로그 상세 조회

```
GET /api/endpoints/{endpointId}/logs/{logId}
```

**인증**: `X-Access-Token` 헤더

**Response**: `200 OK`

```json
{
  "logId": "log_abc123",
  "method": "POST",
  "url": "/api/hooks/a1b2c3d4-...?param=value",
  "headers": {
    "Content-Type": "application/json",
    "X-Custom-Header": "some-value",
    "User-Agent": "PaymentService/2.0",
    "Authorization": "[REDACTED]"
  },
  "queryParams": {
    "param": "value",
    "password": "[REDACTED]"
  },
  "body": {
    "event": "payment.success",
    "amount": 50000
  },
  "bodyPreview": "{\"event\": \"payment.success\", \"amou...",
  "contentType": "application/json",
  "clientIp": "203.0.113.1",
  "bodySize": 256,
  "receivedAt": "2026-06-07T22:40:00Z"
}
```

> **보안 참고**: `authorization`, `x-api-key`, `password` 등 민감한 정보가 포함된 헤더나 쿼리 파라미터는 `[REDACTED]`로 마스킹 처리되어 반환됩니다.

---

### 4.3. 로그 전체 삭제

```
DELETE /api/endpoints/{endpointId}/logs
```

**인증**: `X-Access-Token` 헤더

**Response**: `204 No Content`

---

## 5. 실시간 스트림

### 5.1. SSE 연결

```
GET /api/endpoints/{endpointId}/stream?token={accessToken}
```

**인증**: Query Parameter `token`

**Response**: `200 OK`

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**이벤트 형식**:

```
:heartbeat

data: {"logId":"log_abc123","method":"POST","contentType":"application/json","clientIp":"203.0.113.1","bodyPreview":"{\"event\": \"payme...","bodySize":256,"receivedAt":"2026-06-07T22:40:00Z"}

:heartbeat

data: {"logId":"log_def456","method":"PUT","contentType":"application/xml","clientIp":"198.51.100.1","bodyPreview":"<payment><status>su...","bodySize":512,"receivedAt":"2026-06-07T22:41:00Z"}
```

**연결 제한**:

- IP당 동시 SSE: 5개
- 최대 유지 시간: 30분 (이후 자동 끊김 → FE EventSource 자동 재연결)
- Heartbeat: 30초 간격 (`:heartbeat\n\n`)

---

## 6. 시스템

### 6.1. 헬스체크

```
GET /api/health
```

**인증**: 없음

**Response**: `200 OK`

```json
{
  "status": "UP",
  "timestamp": "2026-06-07T22:40:00Z"
}
```

---

## 7. 전체 엔드포인트 요약

| Method   | Path                               | 인증 | 설명              |
| -------- | ---------------------------------- | :--: | ----------------- |
| `POST`   | `/api/endpoints`                   |  IP  | 엔드포인트 생성   |
| `GET`    | `/api/endpoints/{id}`              | 토큰 | 엔드포인트 정보   |
| `DELETE` | `/api/endpoints/{id}`              | 토큰 | 엔드포인트 삭제   |
| `PATCH`  | `/api/endpoints/{id}/mock`         | 토큰 | 모의 설정 업데이트|
| `ANY`    | `/api/hooks/{id}`                  |  -   | 웹훅 수신         |
| `GET`    | `/api/endpoints/{id}/logs`         | 토큰 | 로그 목록         |
| `GET`    | `/api/endpoints/{id}/logs/{logId}` | 토큰 | 로그 상세         |
| `DELETE` | `/api/endpoints/{id}/logs`         | 토큰 | 로그 전체 삭제    |
| `GET`    | `/api/endpoints/{id}/stream`       | 토큰 | SSE 실시간 스트림 |
| `GET`    | `/api/health`                      |  -   | 헬스체크          |

**총 10개 엔드포인트 (MVP)**
