# MVP API 명세서

> **기술 스택**: Java 21, Spring Boot 4.0.7
> **Rate Limit**: Redis 기반 요청 빈도 제한을 적용해요.

## 1. 공통 사항

### 1.1. Base URL

```text
https://api.flashhook.site
(로컬 개발 시 http://localhost:8080)
```

### 1.2. 인증 방식

```text
REST API  → Cookie: fh_token_{endpointId}={accessToken}   (HttpOnly, Secure, SameSite=Strict)
SSE 스트림 → 동일 쿠키로 인증 (EventSource withCredentials=true)
Admin API → Header: X-Admin-Token: {adminToken}
```

- 엔드포인트 생성(`POST /api/endpoints`) 응답의 `Set-Cookie` 로 쿠키가 발급된다(path=`/api/endpoints/{id}`, maxAge=24h).
- 원본 `accessToken` 은 응답 바디에 포함되지 않는다.
- 엔드포인트 삭제 시 동일 쿠키를 maxAge=0 으로 만료시킨다.
- 브라우저 클라이언트는 헤더를 붙일 필요 없이 `credentials:"include"` 로 쿠키를 자동 전송한다.

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

> **참고**: 전체 에러 코드 및 상세 조치 방안은 `06_error_dictionary.md` 문서를 참조하세요.

| HTTP Status | Code                      | 설명                      |
| :---------: | ------------------------- | ------------------------- |
|     400     | `INVALID_REQUEST`         | 잘못된 요청 파라미터/형식 |
|     400     | `PRESET_INVALID_CONFIG`   | 프리셋 설정 오류          |
|     403     | `INVALID_TOKEN`           | 토큰 없음 또는 불일치     |
|     403     | `FORBIDDEN`               | 권한 없음                 |
|     404     | `ENDPOINT_NOT_FOUND`      | 엔드포인트 없음 또는 만료 |
|     404     | `LOG_NOT_FOUND`           | 요청한 로그가 없음        |
|     404     | `NOT_FOUND`               | 리소스 없음               |
|     409     | `CONCURRENT_MODIFICATION` | 동시성 충돌(낙관적 락)    |
|     413     | `PAYLOAD_TOO_LARGE`       | 요청 Body 1MB 초과        |
|     429     | `RATE_LIMIT_EXCEEDED`     | Rate Limit 초과           |
|     429     | `ENDPOINT_LIMIT_EXCEEDED` | IP당 엔드포인트 수 초과   |
|     500     | `PRESET_SIGNATURE_FAILED` | 프리셋 서명 생성 실패     |
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

```text
Set-Cookie: fh_token_{endpointId}={accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/endpoints/{endpointId}; Max-Age=86400
```

```json
{
  "endpointId": "a1b2c3d4-5e6f-...",
  "accessToken": null,
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

**에러**:

- `429 ENDPOINT_LIMIT_EXCEEDED`: 단기간 내 과도한 생성 요청은 제한돼요.
- `403 FORBIDDEN`: 악성 IP 블랙리스트에 등재된 경우

---

### 2.2. 엔드포인트 정보 조회

```text
GET /api/endpoints/{endpointId}
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

**Response**: `200 OK` (생성 응답 바디 포맷과 동일)

---

### 2.3. 엔드포인트 삭제

```text
DELETE /api/endpoints/{endpointId}
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

**Response**: `204 No Content` (응답에서 `fh_token_{endpointId}` 쿠키를 만료시킴)

---

### 2.4. 모의 응답(Mock) 설정 업데이트

```http
PATCH /api/endpoints/{endpointId}/mock
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

> 부분 업데이트: 제공되지 않은(null) 필드는 변경하지 않는다. `presetOptions.secretKey` 는 저장 시 AES-256/GCM 으로 암호화된다.

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
  "presetType": "PORTONE_V2",
  "presetOptions": {
    "secretKey": "whsec_abcd1234..."
  }
}
```

> `presetType`: 동적 응답 핸들러를 지정해요. `null`이거나 등록되지 않은 타입(예: `KAKAO_*`)이면 `statusCode`, `headers`, `body` 필드 값으로 정적 응답을 돌려줘요. `"SLACK_URL_VERIFICATION"`, `"GITHUB"`, `"PORTONE_V2"` 같은 동적 프리셋을 지정하면 수신 파이프라인(Slack) 또는 발송(Replay) 파이프라인(GitHub, PortOne)에 맞게 인터셉트해요.
> `presetOptions`: `presetType`이 시그니처 생성을 요구할 때 필요한 부가 설정값이에요. `secretKey`는 서버 DB에 저장할 때 AES-256으로 암호화해요.

**Response**: `200 OK` (업데이트된 엔드포인트 정보 반환)

---

## 3. 웹훅 수신

### 3.1. 웹훅 수신 (외부 서비스 호출)

```text
ANY /api/hooks/{endpointId}
```

**인증**: 없음 (외부 서비스가 호출하므로 인증 불가)

**허용 메소드**: GET, POST, PUT, PATCH, DELETE 등 전부

**Response**: 동적 응답 (모의 설정 기반)
엔드포인트의 `mockConfig` 설정에 따라 HTTP 상태 코드, 헤더, 지연(Delay), 본문(Body)을 돌려줘요.

**에러**:
- `404 ENDPOINT_NOT_FOUND`: 존재하지 않거나 만료된 엔드포인트
- `413 PAYLOAD_TOO_LARGE`: Body 1MB 초과
- `429 RATE_LIMIT_EXCEEDED`: 엔드포인트당 수신 요청 빈도가 제한돼요.
> 지연 응답 처리 시 `DeferredResult`(하드 타임아웃 15초, Mock 지연은 `min(delayMs, 10초)`)로 처리됩니다.

---

## 4. 로그 조회 및 관리

### 4.1. 로그 목록 조회

```text
GET /api/endpoints/{endpointId}/logs
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `lastSeenId` | string | null | 커서 기반 페이징을 위한 마지막 로그 ID |
| `size` | int | 20 | 페이지 크기 (최대 100) |
| `sort` | string | desc | 정렬 (desc: 최신순, asc: 오래된순) |

**Response**: `200 OK` (페이징된 로그 목록, `bodyPreview` 포함)

---

### 4.2. 로그 상세 조회

```text
GET /api/endpoints/{endpointId}/logs/{logId}
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

**Response**: `200 OK` (전체 헤더, 쿼리, 파싱된 본문, 용량 등)
> **보안 참고**: Authorization, API Key, 비밀번호 등 민감 정보로 추정되는 헤더나 쿼리 파라미터는 `[REDACTED]`로 마스킹해서 돌려줘요.

---

### 4.3. 공개 로그 공유

```text
GET /api/public/logs/{logId}
```

**인증**: 없음 (IP 기반 Rate Limit 60/분)
**Response**: `200 OK` (`PublicWebhookLogResponse.from()` 으로 마스킹된 페이로드 반환)

> **주의**: 소유권 검증이 없으므로, 공유 링크를 아는 사람은 누구나 마스킹된 로그를 볼 수 있습니다(설계 의도).

---

### 4.4. 로그 전체 삭제

```text
DELETE /api/endpoints/{endpointId}/logs
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`
**Response**: `204 No Content`

---

### 4.5. 웹훅 재전송 (Replay)

```text
POST /api/endpoints/{endpointId}/logs/{logId}/replay
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}`

**Request**:
```json
{
  "destinationUrl": "https://my-ngrok.com/webhook"
}
```

**Response**: `200 OK`
**에러**:
- `429 RATE_LIMIT_EXCEEDED`
- `403 FORBIDDEN` / `400 INVALID_REQUEST`: 타겟 URL이 사설 IP 등 SSRF 공격으로 의심될 경우

---

## 5. 실시간 스트림

### 5.1. SSE 연결

```http
GET /api/endpoints/{endpointId}/stream
```

**인증**: HttpOnly 쿠키 `fh_token_{endpointId}` (FE: `new EventSource(url, { withCredentials: true })`)

**Response**: `200 OK`

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**연결 제한**:
- 최대 유지 시간: 30분 (`flashhook.sse.timeout`, 연결 종료 시 FE EventSource 자동 재연결)
- Heartbeat 주기: 30초 (`flashhook.sse.heartbeat-interval`, 좀비 커넥션 방지)

---

## 6. Admin API

**인증**: `X-Admin-Token` 헤더를 `flashhook.admin.secret-key`와 비교. 불일치 시 403 반환.

- **`GET /api/admin/metrics`**: 운영 메트릭 조회
- **`GET /api/admin/endpoints/suspicious`**: 의심 엔드포인트 목록 조회
- **`DELETE /api/admin/endpoints/{id}`**: 엔드포인트 강제 삭제
- **`GET /api/admin/blacklist`**: IP 블랙리스트 조회
- **`POST /api/admin/blacklist`**: IP 블랙리스트 추가 (Body: `{"ip":"..."}`)
- **`DELETE /api/admin/blacklist/{ip}`**: IP 블랙리스트 삭제 (IP 형식 검증 적용)

---

## 7. 시스템

### 7.1. 헬스체크 및 메트릭

```text
GET /actuator/health
GET /actuator/prometheus
```

**인증**: 없음 (포트 9090 바인딩)

---

## 8. 전체 엔드포인트 요약

| Method | Path | 인증 | 설명 |
| -------- | ----------------------------------------- | :--: | ------------------ |
| `POST` | `/api/endpoints` | IP | 엔드포인트 생성 |
| `GET` | `/api/endpoints/{id}` | 쿠키 | 엔드포인트 정보 |
| `DELETE` | `/api/endpoints/{id}` | 쿠키 | 엔드포인트 삭제 |
| `PATCH` | `/api/endpoints/{id}/mock` | 쿠키 | 모의 설정 업데이트 |
| `ANY` | `/api/hooks/{id}` | - | 웹훅 수신 |
| `GET` | `/api/endpoints/{id}/logs` | 쿠키 | 로그 목록 |
| `GET` | `/api/endpoints/{id}/logs/{logId}` | 쿠키 | 로그 상세 |
| `GET` | `/api/public/logs/{logId}` | IP | 공개 로그 공유 |
| `DELETE` | `/api/endpoints/{id}/logs` | 쿠키 | 로그 전체 삭제 |
| `POST` | `/api/endpoints/{id}/logs/{logId}/replay` | 쿠키 | 수신 웹훅 재전송 |
| `GET` | `/api/endpoints/{id}/stream` | 쿠키 | SSE 실시간 스트림 |
| `GET` | `/api/admin/metrics` | Admin | 운영 메트릭 |
| `GET` | `/api/admin/endpoints/suspicious` | Admin | 의심 엔드포인트 |
| `DELETE` | `/api/admin/endpoints/{id}` | Admin | 엔드포인트 강제 삭제 |
| `GET/POST/DELETE`| `/api/admin/blacklist[/{ip}]` | Admin | IP 블랙리스트 관리 |
| `GET` | `/actuator/health` <br> `/actuator/prometheus` | - | 헬스/메트릭 (포트 9090)|
