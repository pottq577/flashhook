# 보안 및 리소스 제한 정책

## 1. 인증 설계

### 1.1. 핵심 전제

회원가입 없음 → 전통적 인증(JWT, 세션) 불가. **URL 토큰 기반 접근 제어** 적용.

### 1.2. URL 분리 전략

| URL 유형         | 용도               |       공개 여부        |
| ---------------- | ------------------ | :--------------------: |
| Webhook 수신 URL | 외부 서비스에 등록 |        **공개**        |
| Dashboard URL    | 로그 열람          | **비공개** (토큰 필요) |

```text
[수신 URL]    POST https://flashhook.kr/api/hooks/{endpointId}
[대시보드 URL] GET  https://flashhook.kr/dashboard/{endpointId}?token={accessToken}
```

수신 URL이 노출되어도 → 대시보드 접근 불가 (토큰 분리).

### 1.3. 토큰 생성 및 저장

```text
생성 시:
  endpointId  = UUID v4 (공개용, 2^122 조합 → 무차별 대입 비현실적)
  accessToken = crypto-random 32byte → Base64URL 인코딩 (비공개)

저장:
  서버: accessToken의 SHA-256 해시만 MongoDB에 저장
  클라이언트: 원본 accessToken은 생성 시 1회만 반환, 이후 서버에서 소멸
```

### 1.4. 토큰 전달 방식

```text
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

| 대상            | 제한        | Window | Redis Key                   | 상태 |
| --------------- | ----------- | ------ | --------------------------- | :--: |
| 엔드포인트 생성 | 5개/IP      | 24시간 | `rl:create:{ip}`            | 완료 |
| 웹훅 수신       | 100건/EP/IP | 1분    | `rl:hook:{endpointId}:{ip}` | 완료 |
| 대시보드 조회   | -           | -      | -                           | 예정 |
| SSE 동시 연결   | -           | -      | -                           | 예정 |

> **엔드포인트 생성 제한**: 무분별한 생성을 막기 위해 24시간 동안 IP당 5개로 제한합니다.
> **웹훅 수신 제한**: 악의적인 도배 요청을 막기 위해 동일 IP에서 특정 엔드포인트로의 요청을 분당 100건으로 제한합니다.

---

## 4. 리소스 제한 정책

### 4.1. 엔드포인트 제한

| 항목                      | 제한값           | 상태 |
| ------------------------- | ---------------- | :--: |
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
| ------------------ | ------------------------------------------------- | :--: |
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

```text
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
