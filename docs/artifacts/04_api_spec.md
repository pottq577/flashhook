# MVP API 명세서

> **기술 스택**: Java 21, Spring Boot 3.5.15
> **Rate Limit**: Redis를 이용한 고정 윈도우(Fixed Window Counter) 알고리즘 기반으로 적용됩니다.

## 1. 공통 사항

### 1.1. Base URL

```text
https://api.flashhook.site/api
```

### 1.2. 인증 방식

```text
REST API  → Header: X-Access-Token: {accessToken}
SSE 스트림 → 2-Step 인증 (POST /stream-token 후 GET /stream?streamToken=...)
```

### 1.3. 공통 에러 응답 형식

```json
{
  "code": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 메시지",
  "status": 400,
  "timestamp": "2026-06-07T22:40:00Z",
  "path": "/api/endpoints"
}
```

### 1.4. 에러 코드 목록 (주요 항목)

> **참고**: 전체 에러 코드 및 상세 조치 방안은 `05_error_dictionary.md` (통합 에러 코드 사전) 문서를 참조하세요.

| HTTP Status | Code                      | 설명                      |
| :---------: | ------------------------- | ------------------------- |
|     400     | `INVALID_REQUEST`         | 잘못된 요청 파라미터/형식 |
|     403     | `INVALID_TOKEN`           | 토큰 없음 또는 불일치     |
|     403     | `FORBIDDEN`               | 권한 없음                 |
|     404     | `ENDPOINT_NOT_FOUND`      | 엔드포인트 없음 또는 만료 |
|     404     | `LOG_NOT_FOUND`           | 요청한 로그가 없음        |
|     408     | `REQUEST_TIMEOUT`         | 처리 시간 지연 타임아웃   |
|     409     | `CONCURRENT_MODIFICATION` | 동시성 충돌 발생          |
|     413     | `PAYLOAD_TOO_LARGE`       | 요청 Body 1MB 초과        |
|     429     | `RATE_LIMIT_EXCEEDED`     | Rate Limit 초과           |
|     429     | `ENDPOINT_LIMIT_EXCEEDED` | IP당 엔드포인트 수 초과   |
|     500     | `INTERNAL_ERROR`          | 서버 내부 에러            |

---

## 2. 엔드포인트 관리

### 2.1. 엔드포인트 생성

```text
POST /api/endpoints
```

**인증**: 없음 (IP 기반 Rate Limit)

**Request**:

```text
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
  "webhookUrl": "https://api.flashhook.site/api/hooks/a1b2c3d4-5e6f-...",
  "dashboardUrl": "https://flashhook.site/dashboard/a1b2c3d4-5e6f-...",
  "expiresAt": "2026-06-08T22:35:00Z",
  "limits": {
    "maxLogs": 500,
    "maxSizeMb": 5
  },
  "mockConfig": {
    "statusCode": 200,
    "delayMs": 0,
    "headers": {},
    "body": "ok",
    "presetType": null
  }
}
```

> `accessToken`은 이 응답에서만 원본 반환. 이후 서버에 해시로만 존재.

**에러**:

- `429 ENDPOINT_LIMIT_EXCEEDED`: 5개/IP/24시간 초과 (고정 윈도우)

---

### 2.2. 엔드포인트 정보 조회

```text
GET /api/endpoints/{endpointId}
```

**인증**: `X-Access-Token` 헤더

**Response**: `200 OK`

```json
{
  "endpointId": "a1b2c3d4-...",
  "label": "Toss 결제테스트",
  "webhookUrl": "https://api.flashhook.site/api/hooks/a1b2c3d4-...",
  "dashboardUrl": "https://flashhook.site/dashboard/a1b2c3d4-...",
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
    "body": "ok",
    "presetType": null
  }
}
```

---

### 2.3. 엔드포인트 삭제

```text
DELETE /api/endpoints/{endpointId}
```

**인증**: `X-Access-Token` 헤더

**Response**: `204 No Content`

> 엔드포인트 + 관련 로그 전부 즉시 삭제.

---

### 2.4. 모의 응답(Mock) 설정 업데이트

```http
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
  "body": "{\"error\": \"Bad Request\"}",
  "presetType": "SLACK_URL_VERIFICATION"
}
```

> `presetType`: 동적 응답 핸들러를 지정합니다. `null`일 경우 `statusCode`, `headers`, `body` 필드 값으로 고정 응답을 반환합니다. `"SLACK_URL_VERIFICATION"` 같은 동적 프리셋 지정 시, **기존 `statusCode`, `headers`, `body` 값은 무시**되고 핸들러가 동적으로 생성한 응답이 강제 적용되나, **`delayMs`는 여전히 유효**하여 지연 응답 테스트가 가능합니다.

**Response**: `200 OK` (업데이트된 엔드포인트 정보 반환)

---

## 3. 웹훅 수신

### 3.1. 웹훅 수신 (외부 서비스 호출)

```text
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

**Response**: 동적 응답 (모의 설정 기반)

엔드포인트의 `mockConfig` 설정에 따라 HTTP 상태 코드, 헤더, 지연(Delay), 본문(Body)이 반환됩니다.
기본 설정(수정하지 않았을 경우) 응답:
`200 OK`

```text
ok
```

**에러**:

- `404 ENDPOINT_NOT_FOUND`: 존재하지 않거나 만료된 엔드포인트
- `413 PAYLOAD_TOO_LARGE`: Body 1MB 초과
- `429 RATE_LIMIT_EXCEEDED`: 100건/EP/1분 초과 (고정 윈도우)
- `408 REQUEST_TIMEOUT`: 지연 시간이 너무 길어 타임아웃 발생 시 (서버 하드 타임아웃 15초, Mock 설정은 최대 10초까지 허용)

---

## 4. 로그 조회

### 4.1. 로그 목록 조회

```text
GET /api/endpoints/{endpointId}/logs
```

**인증**: `X-Access-Token` 헤더

**Query Parameters**:

| 파라미터     | 타입   | 기본값 | 설명                                          |
| ------------ | ------ | ------ | --------------------------------------------- |
| `lastSeenId` | string | null   | (선택) 커서 기반 페이징을 위한 마지막 로그 ID |
| `page`       | int    | 0      | 페이지 번호                                   |
| `size`       | int    | 20     | 페이지 크기 (최대 100)                        |
| `sort`       | string | desc   | 정렬 (desc: 최신순, asc: 오래된순)            |

**Response**: `200 OK`

```json
{
  "content": [
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
  "totalElements": 42,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

> `bodyPreview`: Body 앞 300자 텍스트 절단. 저장 시점에 BE에서 생성.
> `lastSeenId` 제공 시 `page` 값은 무시되며 커서 기반으로 조회됩니다.

---

### 4.2. 로그 상세 조회

```text
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

```text
DELETE /api/endpoints/{endpointId}/logs
```

**인증**: `X-Access-Token` 헤더

**Response**: `204 No Content`

---

## 5. 실시간 스트림

### 5.1. SSE 연결

실시간 스트림은 보안을 위해 `streamToken`을 먼저 발급받은 후 `EventSource`를 연결하는 2-Step 방식으로 동작합니다.

#### 1) Stream Token 발급

```http
POST /api/endpoints/{endpointId}/stream-token
```

**인증**: `X-Access-Token` 헤더

**Response**: `200 OK`

```json
{
  "streamToken": "xxx-sample-token-xxx"
}
```

#### 2) SSE 연결

```http
GET /api/endpoints/{endpointId}/stream?streamToken={streamToken}
```

**인증**: Query Parameter `streamToken` (1회용, 30초 내 사용해야 함)

**Response**: `200 OK`

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**이벤트 형식**:

```text
event: ping
data:

event: webhook
data: {"logId":"log_abc123","method":"POST","contentType":"application/json","clientIp":"203.0.113.1","bodyPreview":"{\"event\": \"payme...","bodySize":256,"receivedAt":"2026-06-07T22:40:00Z"}
```

**연결 제한**:

- IP당 동시 SSE: 5개
- 최대 유지 시간: 서버 설정 시간 (연결 종료 시 FE EventSource 자동 재연결)
- Heartbeat 주기: 30초 (좀비 커넥션 방지)

---

## 6. 시스템

### 6.1. 헬스체크

```text
GET /api/actuator/health
```

**인증**: 없음

**Response**: `200 OK`

```json
{
  "status": "UP"
}
```

---

## 7. 전체 엔드포인트 요약

| Method   | Path                               | 인증 | 설명               |
| -------- | ---------------------------------- | :--: | ------------------ |
| `POST`   | `/api/endpoints`                   |  IP  | 엔드포인트 생성    |
| `GET`    | `/api/endpoints/{id}`              | 토큰 | 엔드포인트 정보    |
| `DELETE` | `/api/endpoints/{id}`              | 토큰 | 엔드포인트 삭제    |
| `PATCH`  | `/api/endpoints/{id}/mock`         | 토큰 | 모의 설정 업데이트 |
| `ANY`    | `/api/hooks/{id}`                  |  -   | 웹훅 수신          |
| `GET`    | `/api/endpoints/{id}/logs`         | 토큰 | 로그 목록          |
| `GET`    | `/api/endpoints/{id}/logs/{logId}` | 토큰 | 로그 상세          |
| `DELETE` | `/api/endpoints/{id}/logs`         | 토큰 | 로그 전체 삭제     |
| `POST`   | `/api/endpoints/{id}/stream-token` | 토큰 | 스트림 토큰 발급   |
| `GET`    | `/api/endpoints/{id}/stream`       | 토큰 | SSE 실시간 스트림  |
| `GET`    | `/api/actuator/health`             |  -   | 헬스체크           |

총 11개 엔드포인트 (MVP)
