# FlashHook — 보안 및 리소스 제한 정책

> 비로그인 서비스의 접근 제어, Rate Limiting, 리소스 상한
> 최종 수정: 2026-06-10

---

## 1. 인증 설계

### 1.1. 핵심 전제

회원가입 없음 → 전통적 인증(JWT, 세션) 불가. **URL 토큰 기반 접근 제어** 적용.

### 1.2. URL 분리 전략

| URL 유형         | 용도               |       공개 여부        |
| ---------------- | ------------------ | :--------------------: |
| Webhook 수신 URL | 외부 서비스에 등록 |        **공개**        |
| Dashboard URL    | 로그 열람          | **비공개** (토큰 필요) |

```
[수신 URL]    POST https://flashhook.kr/api/hooks/{endpointId}
[대시보드 URL] GET  https://flashhook.kr/dashboard/{endpointId}?token={accessToken}
```

수신 URL이 노출되어도 → 대시보드 접근 불가 (토큰 분리).

### 1.3. 토큰 생성 및 저장

```
생성 시:
  endpointId  = UUID v4 (공개용, 2^122 조합 → 무차별 대입 비현실적)
  accessToken = crypto-random 32byte → Base64URL 인코딩 (비공개)

저장:
  서버: accessToken의 SHA-256 해시만 MongoDB에 저장
  클라이언트: 원본 accessToken은 생성 시 1회만 반환, 이후 서버에서 소멸
```

### 1.4. 토큰 전달 방식

```
REST API  → Header: X-Access-Token: {accessToken}
SSE 스트림 → 1단계: POST `/api/endpoints/{id}/stream-token` (헤더 인증) -> 일회용 `streamToken` 발급
            2단계: GET `/api/endpoints/{id}/stream?streamToken={streamToken}` (EventSource 사용)
```

> **보안 참고:** 클라이언트에서 토큰을 `sessionStorage`에 저장 후, 브라우저 History API(`replaceState`)를 사용하여 URL에서 토큰을 즉시 제거하여 유출을 방지합니다.

---

## 2. 접근 제어 매트릭스

| 동작             |  필요한 인증  | 설명                          |
| ---------------- | :-----------: | ----------------------------- |
| 엔드포인트 생성  |     IP만      | Rate Limit으로 남용 방지      |
| 웹훅 수신 (POST) |     없음      | 외부 서비스가 호출. 인증 불가 |
| 대시보드 조회    | `accessToken` | 토큰 없으면 403               |
| SSE 로그 스트림  | `streamToken` | POST 발급 후 GET 연결 검증    |
| 엔드포인트 삭제  | `accessToken` | 수동 삭제                     |
| 로그 전체 삭제   | `accessToken` | 수동 삭제                     |

---

## 3. Rate Limiting 정책

Redis 기반 고정 Window (Fixed Window) Counter 구현.

| 대상            | 제한            | Window | Redis Key                         | 상태 |
| --------------- | --------------- | ------ | --------------------------------- | :---: |
| 엔드포인트 생성 | 5개/IP          | 24시간 | `rl:create:{ip}`                  | 완료 |
| 웹훅 수신       | 100건/EP/IP     | 1분    | `rl:hook:{endpointId}:{ip}`       | 완료 |
| 대시보드 조회   | -               | -      | -                                 | 예정 |
| SSE 동시 연결   | -               | -      | -                                 | 예정 |

> **엔드포인트 생성 제한**: 무분별한 생성을 막기 위해 24시간 동안 IP당 5개로 제한합니다.
> **웹훅 수신 제한**: 악의적인 도배 요청을 막기 위해 동일 IP에서 특정 엔드포인트로의 요청을 분당 100건으로 제한합니다.

---

## 4. 리소스 제한 정책

### 4.1. 엔드포인트 제한

| 항목                      | 제한값           | 상태 |
| ------------------------- | ---------------- | :---: |
| IP당 동시 활성 엔드포인트 | 10개             | 예정 |
| 엔드포인트 수명 (TTL)     | 24시간           | 완료 |
| 수동 삭제                 | 가능 (토큰 인증) | 완료 |

### 4.2. 요청 제한

| 항목                | 제한값                                     |
| ------------------- | ------------------------------------------ |
| 단일 요청 Body 크기 | 1MB (Spring Boot 레벨 하드 리밋)           |
| 요청 Header 총 크기 | 8KB (Tomcat 기본값)                        |
| 허용 HTTP 메소드    | 모든 메소드 (GET/POST/PUT/PATCH/DELETE 등) |
| Content-Type 제한   | 없음 (JSON, XML, form-data 등 전부 수신)   |

### 4.3. 로그 저장 제한

| 항목                        | 제한값                                |
| --------------------------- | ------------------------------------- |
| 엔드포인트당 최대 로그 수   | 500건                                 |
| 엔드포인트당 최대 로그 용량 | 5MB                                   |
| 적용 기준                   | **500건 OR 5MB 중 먼저 도달**         |
| 초과 시 동작                | 순환 덮어쓰기 (가장 오래된 로그 삭제) |
| 로그 보존 기간              | 24시간 (TTL Index)                    |

### 4.4. SSE 연결 제한

| 항목               | 제한값                                            | 상태 |
| ------------------ | ------------------------------------------------- | :---: |
| IP당 동시 SSE 연결 | 최대 5개                                          | 예정 |
| SSE 최대 유지 시간 | 30분 (이후 자동 끊김, FE EventSource 자동 재연결) | 완료 |
| Heartbeat 주기     | 30초 (좀비 커넥션 방지)                           | 완료 |

---

## 5. 위협 대응

| 위협                        | 대응                                         |
| --------------------------- | -------------------------------------------- |
| 엔드포인트 ID 무차별 대입   | UUID v4 = 2^122 조합 → 현실적 불가능         |
| 봇 대량 생성                | Rate Limit (5개/IP/24시간)                   |
| Payload 악성 스크립트 (XSS) | 대시보드 로그 렌더링 시 HTML 이스케이프 필수 |
| 대용량 Payload 공격         | 1MB 하드 리밋 (Spring Boot 설정)             |
| 좀비 SSE 커넥션             | 30초 Heartbeat + 전송 실패 시 자원 회수      |
| 만료 후 데이터 잔존         | MongoDB TTL Index 자동 삭제 + 모니터링       |

---

## 6. 보안 적용 현황 (MVP)

MVP 개발 과정에서 아래 주요 보안 이슈들이 모두 코드로 구현 완료되었습니다.

| 항목                   | 구현 방식 및 위치                                                                    | 상태 |
| ---------------------- | ------------------------------------------------------------------------------------ | ---- |
| URL 토큰 유출 방지     | 프론트엔드 `endpoint.queries.ts`에서 `window.history.replaceState()`로 토큰 제거     | 완료 |
| Payload 크기 절대 제한 | `application.yaml`의 `multipart.max-file-size` 및 `max-http-form-post-size` 1MB 적용 | 완료 |
| SSE Idle Timeout       | `SseEmitterService.java` 내 30초 주기의 Heartbeat 이벤트(`event: ping`) 전송         | 완료 |

---

## 7. 전체 플로우 요약

```
[유저] → 생성 버튼 클릭
  ↓
[서버] → endpointId(UUID) + accessToken(random) 생성
       → accessToken SHA-256 해시로 MongoDB 저장
       → 원본 accessToken + URL 조합을 응답으로 1회 반환
  ↓
[유저 브라우저] → dashboardUrl (토큰 포함) 보관
              → webhookUrl을 외부 서비스에 등록
  ↓
[외부 서비스] → webhookUrl로 POST 요청
  ↓
[서버] → 로그 저장 (캡 체크) → SSE로 대시보드 푸시 (토큰 검증된 연결에만)
  ↓
[24시간 후] → TTL Index → 엔드포인트 + 로그 자동 삭제
```


# FlashHook — MVP API 명세서

> Webhook Catcher (Phase 1) 전체 엔드포인트
> 최종 수정: 2026-06-07

---

## 1. 공통 사항

> **기술 스택**: Java 21, Spring Boot 3.5.0
> **Rate Limit**: Redis를 이용한 고정 윈도우(Fixed Window Counter) 알고리즘 기반으로 적용됩니다.

### 1.1. Base URL

```
https://flashhook.kr/api
```

### 1.2. 인증 방식

```
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

- `429 ENDPOINT_LIMIT_EXCEEDED`: 5개/IP/24시간 초과 (고정 윈도우)

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
- `408 REQUEST_TIMEOUT`: 지연 시간이 너무 길어 타임아웃 발생 시 (최대 15초)

---

## 4. 로그 조회

### 4.1. 로그 목록 조회

```
GET /api/endpoints/{endpointId}/logs
```

**인증**: `X-Access-Token` 헤더

**Query Parameters**:

| 파라미터   | 타입   | 기본값 | 설명                               |
| ---------- | ------ | ------ | ---------------------------------- |
| `lastSeenId`| string | null   | (선택) 커서 기반 페이징을 위한 마지막 로그 ID |
| `page`     | int    | 0      | 페이지 번호                        |
| `size`     | int    | 20     | 페이지 크기 (최대 100)             |
| `sort`     | string | desc   | 정렬 (desc: 최신순, asc: 오래된순) |

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

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**이벤트 형식**:

```
event: ping
data:

event: webhook
data: {"logId":"log_abc123","method":"POST","contentType":"application/json","clientIp":"203.0.113.1","bodyPreview":"{\"event\": \"payme...","bodySize":256,"receivedAt":"2026-06-07T22:40:00Z"}
```

**연결 제한**:

- IP당 동시 SSE: 5개
- 최대 유지 시간: 서버 설정 시간 (연결 종료 시 FE EventSource 자동 재연결)

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
| `POST`   | `/api/endpoints/{id}/stream-token` | 토큰 | 스트림 토큰 발급  |
| `GET`    | `/api/endpoints/{id}/stream`       | 토큰 | SSE 실시간 스트림 |
| `GET`    | `/api/health`                      |  -   | 헬스체크          |

**총 11개 엔드포인트 (MVP)**


# FlashHook — 통합 에러 코드 사전 (Error Dictionary)

> 애플리케이션 전역 통합 에러 코드 및 예외 처리 정책
> 최종 수정: 2026-06-10

---

## 1. 개요

FlashHook은 프론트엔드 및 서드파티 클라이언트가 시스템 오류를 명확히 인지하고 적절히 대응할 수 있도록 `GlobalExceptionHandler`를 통해 일관된 에러 응답 포맷을 반환합니다.

### 1.1. 에러 응답 포맷 (Flat JSON)
```json
{
  "code": "INVALID_TOKEN",
  "message": "유효하지 않은 액세스 토큰입니다",
  "status": 403
}
```

---

## 2. 통합 에러 코드 맵

백엔드(`ErrorCode.java`)에 정의된 모든 비즈니스 예외 및 시스템 오류 코드입니다. 프론트엔드는 `code` 문자열을 기반으로 분기 처리를 수행해야 합니다.

| HTTP Status | 에러 코드 (Code) | 기본 메시지 (Message) | 발생 원인 / 프론트엔드 대응 가이드 |
| :--- | :--- | :--- | :--- |
| **400** | `INVALID_REQUEST` | 잘못된 요청 파라미터입니다 | 클라이언트가 필수 파라미터를 누락했거나 타입이 맞지 않을 때. (요청 데이터 점검 필요) |
| **403** | `INVALID_TOKEN` | 유효하지 않은 액세스 토큰입니다 | `X-Access-Token` 헤더가 없거나, 변조되었거나, 만료된 경우. (사용자를 홈 화면으로 리다이렉트) |
| **403** | `FORBIDDEN` | 해당 리소스에 접근할 권한이 없습니다 | 본인이 생성하지 않은 엔드포인트의 로그를 삭제하거나 수정하려 할 때. |
| **404** | `ENDPOINT_NOT_FOUND` | 엔드포인트를 찾을 수 없습니다 | 존재하지 않거나 24시간이 지나 만료(삭제)된 엔드포인트 ID로 접근했을 때. (404 페이지 노출) |
| **404** | `LOG_NOT_FOUND` | 웹훅 로그를 찾을 수 없습니다 | 존재하지 않는 특정 웹훅 로그 ID를 조회하려 할 때. |
| **409** | `CONCURRENT_MODIFICATION` | 리소스가 다른 사용자에 의해 수정되었습니다 | 엔드포인트 낙관적 락(Optimistic Lock) 충돌 시 발생. (데이터 리패치 후 재시도 안내) |
| **413** | `PAYLOAD_TOO_LARGE` | 페이로드 크기가 제한을 초과했습니다 | 단일 웹훅 수신 본문이 허용된 최대 용량(예: 1MB)을 초과한 경우. (송신 측에 크기 조절 요청) |
| **429** | `ENDPOINT_LIMIT_EXCEEDED` | 엔드포인트 생성 제한을 초과했습니다 | 동일 IP에서 24시간 내 생성 가능한 엔드포인트 갯수(5개)를 초과했을 때. (제한 만료 후 재시도 안내) |
| **429** | `RATE_LIMIT_EXCEEDED` | 요청 제한을 초과했습니다 | 단일 엔드포인트에 1분당 100건 이상의 웹훅이 인입된 경우 (DDoS/Spam 방지). |
| **500** | `INTERNAL_ERROR` | 서버 내부 오류가 발생했습니다 | DB 연결 실패, Redis 타임아웃, 예기치 않은 서버 런타임 익셉션. (잠시 후 다시 시도 안내) |

---

## 3. 프론트엔드 예외 처리 정책

1. **사용자 귀책 사유 (400, 403, 404, 409, 413, 429)**
   *   단순 알림이 필요한 경우 우측 하단 토스트(Toast) 메시지를 통해 서버의 `message`를 그대로 띄워 사용자에게 행동 교정을 유도합니다.
   *   `INVALID_TOKEN` 또는 `ENDPOINT_NOT_FOUND`의 경우 진행 중이던 데이터 페칭이나 SSE 연결을 즉시 중단하고, 로컬 캐시를 지운 뒤 랜딩 페이지(홈)로 강제 라우팅합니다.

2. **서버 귀책 사유 (500)**
   *   Toast 메시지로 "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."라는 범용 메시지를 표시하며, 사용자에게 기술적인 에러 코드를 직접 노출하지 않습니다.


