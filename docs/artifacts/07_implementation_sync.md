# 구현 동기화 · 문서 갭 리포트 (Implementation Sync)

> **목적**: 현재 구현부(백엔드 `FH_backend`, 프론트엔드 `FH_frontend`)를 기준으로,
> 기존 설계 문서에서 **누락되었거나 최신화되지 않은 내용**을 정리하고 "코드가 실제로 하는 일"을 명시한다.
> 이 문서는 코드를 진실(source of truth)로 간주한다.
>
> **작성 기준 리비전**: 리뷰 시점의 `main` 워킹 트리
> **연관 문서**: `05_api_spec.md`, `06_error_dictionary.md`, `04_system_architecture.md`, `adr/0002`, `security/SECURITY_OVERVIEW.md`

---

## A. 요약 — 무엇이 어긋나 있나

| #   | 항목                                                                        | 유형      | 심각도 | 조치                   |
| --- | --------------------------------------------------------------------------- | --------- | :----: | ---------------------- |
| A1  | 인증: 헤더/`stream-token` → **HttpOnly 쿠키**                               | 문서 낡음 |  높음  | `05` 갱신 완료         |
| A2  | Kakao 동적 `presetType` 백엔드 핸들러 부재                                  | 기능 갭   |  중간  | 구현 or 문구 정정 필요 |
| A3  | GitHub/PortOne 요청 서명 = ADR-0002 "Phase 2 제외"인데 이미 구현            | 문서 낡음 |  중간  | `adr/0002` 보강 완료   |
| A4  | Redis Pub/Sub 스케일아웃 = 스텁(단일 인스턴스)                              | 기능 미완 |  중간  | 문서 명시 필요         |
| A5  | Admin 도메인(`/api/admin/**`) 문서 부재                                     | 문서 누락 |  중간  | 본 문서 §D 로 보완     |
| A6  | 공개 로그 공유(`/api/public/logs/{id}`, `/session/{id}`) 문서 부재          | 문서 누락 |  중간  | 본 문서 §E 로 보완     |
| A7  | 에러 코드 표 불일치(`REQUEST_TIMEOUT`/`408` 없음, `PRESET_*` 누락)          | 문서 낡음 |  낮음  | `05`/`06` 정정         |
| A8  | `SecurityHeadersFilter` 가 존재하지 않는 경로(`/api/auth`,`/api/user`) 대상 | 잔재 코드 |  낮음  | 코드 정리 권장         |
| A9  | Base URL/포트/도메인 표기 산발적 불일치                                     | 문서 낡음 |  낮음  | 정정 권장              |

---

## A1. 인증 — 실제는 HttpOnly 쿠키 (헤더/stream-token 아님)

- **문서(구)**: `05_api_spec.md` §1.2 — REST 는 `X-Access-Token` 헤더, SSE 는
  `POST /stream-token` → `GET /stream?streamToken=...` 2-step.
- **코드(실제)**:
  - 모든 보호 API 는 **`fh_token_{endpointId}` HttpOnly·Secure·SameSite=Strict 쿠키**로 인증
    (`AccessTokenFilter`). 쿠키는 생성 시 `Set-Cookie`(path=`/api/endpoints/{id}`, maxAge 24h)로 발급,
    삭제 시 maxAge=0 으로 만료(`EndpointController`).
  - FE 는 `fetch(..., credentials:"include")`, SSE 는 `EventSource(..., withCredentials:true)`.
  - **`stream-token` 엔드포인트/`streamToken` 로직은 코드에 존재하지 않는다.**
  - `SECURITY_OVERVIEW.md` 는 이미 쿠키 방식으로 최신화되어 코드와 일치.
- **정정**: `05_api_spec.md` 를 쿠키 인증으로 갱신, `stream-token` 절/요약행 삭제(본 PR에서 적용).

## A2. Kakao 동적 프리셋 — 백엔드 핸들러 없음

- **FE** `entities/endpoint/model/presets.ts` 는 다음 `presetType` 을 지정한다:
  `KAKAO_UNLINK_WEBHOOK`, `KAKAO_ACCOUNT_STATUS_CHANGE`, `KAKAO_CHANNEL_CALLBACK`.
- **백엔드** `PresetHandlerRegistry` 등록 핸들러는 **`SLACK_URL_VERIFICATION`(응답),
  `GITHUB`·`PORTONE_V2`(요청 서명) 3종뿐**이다.
- **결과**: 카카오 `presetType` 은 `MockResponseScheduler` 에서 매칭되지 않아 특수 동적 처리 없이
  **정적 body 그대로 응답**된다(오류는 아님, 그러나 "동적"이라는 기대와 다름).
- **선택지**: (a) 카카오 응답 핸들러 구현, 또는 (b) 해당 시나리오는 정적임을 UI/문서에 명시.

## A3. ADR-0002 — Type B(요청 서명)는 이미 구현됨

- ADR-0002 는 GitHub/PortOne 서명(Type B)을 "Phase 2 범위 제외 — 별도 Webhook Sender PRD 선행"으로
  규정했다.
- 그러나 **`GitHubPresetHandler`(`X-Hub-Signature-256`), `PortOnePresetHandler`
  (`webhook-id/-timestamp/-signature`) 가 구현**되어 있고, **Replay 경로**
  (`WebhookReplayService.replayLog` → `getRequestSigningHandler(...).handleRequestGeneration(...)`)에서
  동작한다. 즉 별도 도메인이 아니라 **Replay 발신 시 서명 주입** 형태로 실현되었다.
- **정정**: ADR-0002 에 구현 상태 노트 추가(본 PR에서 적용).

## A4. Redis Pub/Sub 스케일아웃 — 스텁 (현재 단일 인스턴스)

- `RedisMessagePublisher.publish()` / `RedisMessageSubscriber.onMessage()` 는 **본문이 비어 있다**
  (주석: "향후 스케일아웃 시 활성화").
- SSE 팬아웃은 `SseEmitterService` 의 **인메모리 `Map<endpointId, List<SseEmitter>>`** 기반.
  → **다중 인스턴스로 확장 시**, 다른 인스턴스에 붙은 구독자는 웹훅 알림을 받지 못한다.
- **문서 조치**: `04_system_architecture.md` 가 스케일아웃을 전제한다면 "현재 단일 인스턴스,
  Pub/Sub 미구현" 을 명시. 실제 스케일아웃하려면 publish/subscribe 구현 필요.

---

## B. 구현이 문서와 일치하는(검증된) 사항

- **24h TTL**: `Endpoint.createdAt`, `WebhookLog.receivedAt` 모두 `@Indexed(expireAfter="PT24H")`.
- **토큰 비저장**: accessToken 은 SHA-256 해시만 저장(`AccessTokenUtil`), 원본은 쿠키로만.
- **로그 상한**: 엔드포인트당 500건 / 5MB, 원자적 카운터(`findAndModify`) + 앱레벨 enforce.
- **SSRF 다층 방어**: 스킴 화이트리스트 + 사설/loopback/link-local/ULA 차단 + **IP 핀닝(DNS rebinding 방어)**
  - 리다이렉트 차단 + connect3s/read5s 타임아웃(`ReplayHttpClient`).
- **시크릿 암호화**: `presetOptions.secretKey` 를 **AES-256/GCM** 로 저장(`EncryptionUtil`).
- **드리프트 완화(ADR-0003)**: 프리셋 `lastVerifiedAt` + 원클릭 이슈 리포트 URL 구현.
- **2-Layered 예외(ADR-0004)**: Replay/서명/SSE 경로에서 상태 기록 후 재던짐.
- **에러 code 우선 노출(06)**: `ErrorCode` enum ↔ FE `client.ts` code 우선 파싱 일치.

---

## C. 실제 REST 엔드포인트 (코드 기준 전수)

| Method | Path                                       | 인증              | 컨트롤러                              |
| ------ | ------------------------------------------ | ----------------- | ------------------------------------- |
| POST   | `/api/endpoints`                           | 없음(RL)          | EndpointController                    |
| GET    | `/api/endpoints/{id}`                      | 쿠키              | EndpointController                    |
| DELETE | `/api/endpoints/{id}`                      | 쿠키              | EndpointController (응답에 쿠키 만료) |
| PATCH  | `/api/endpoints/{id}/mock`                 | 쿠키              | EndpointController                    |
| ANY    | `/api/hooks/{id}`                          | 없음(RL)          | WebhookReceiveController              |
| GET    | `/api/endpoints/{id}/logs`                 | 쿠키              | WebhookLogController                  |
| GET    | `/api/endpoints/{id}/logs/{logId}`         | 쿠키              | WebhookLogController                  |
| DELETE | `/api/endpoints/{id}/logs`                 | 쿠키              | WebhookLogController                  |
| POST   | `/api/endpoints/{id}/logs/{logId}/replay`  | 쿠키              | WebhookLogController                  |
| GET    | `/api/endpoints/{id}/stream`               | 쿠키              | WebhookStreamController (SSE)         |
| GET    | `/api/public/logs/{logId}`                 | 없음(RL 60/분/IP) | PublicWebhookLogController            |
| GET    | `/api/admin/metrics`                       | `X-Admin-Token`   | AdminController                       |
| GET    | `/api/admin/endpoints/suspicious`          | `X-Admin-Token`   | AdminController                       |
| DELETE | `/api/admin/endpoints/{id}`                | `X-Admin-Token`   | AdminController                       |
| GET    | `/api/admin/blacklist`                     | `X-Admin-Token`   | AdminController                       |
| POST   | `/api/admin/blacklist`                     | `X-Admin-Token`   | AdminController                       |
| DELETE | `/api/admin/blacklist/{ip}`                | `X-Admin-Token`   | AdminController                       |
| GET    | `/actuator/health`, `/actuator/prometheus` | 없음              | Actuator (**포트 9090 · 127.0.0.1**)  |

> `05_api_spec.md` 의 "총 12개(MVP)" 는 낡음 — Admin/공개공유 포함 시 실제로는 더 많다.

---

## D. Admin 도메인 (문서 신규)

- **인증**: `AdminAuthFilter` 가 `/api/admin` 전체에 대해 `X-Admin-Token` 헤더를
  `flashhook.admin.secret-key` 와 **상수 시간 비교**. 불일치 시 403.
- **기능**: 운영 메트릭 조회, 의심 엔드포인트 목록, 엔드포인트 강제 삭제,
  IP 블랙리스트 조회/추가/삭제(삭제 시 IP 형식 정규식 검증).
- **FE**: `/admin/login`, `/admin`(`RequireAdminAuth` 가드) + 위젯
  (`AdminMetricsWidget`, `AdminAbuserTable`, `AdminBlacklistManager`, `AdminInfrastructureWidget`).
- **레이트리밋/블랙리스트 연동**: `RateLimitFilter` 가 `blacklist:ip:{ip}` 를 선검사하여 차단.

## E. 공개 로그 공유 (문서 신규)

- **API**: `GET /api/public/logs/{logId}` — 인증 없음, `PublicWebhookLogResponse.from()` 으로
  **마스킹된** 페이로드 반환. 레이트리밋 60/분/IP.
- **FE**: `/session/{logId}` (`PublicSessionPage`) 에서 소비 — 로그를 URL 로 공유하는 용도.
- **주의**: 소유권(쿠키) 검증이 없으므로, 공유 링크를 아는 사람은 마스킹된 로그를 볼 수 있다(설계 의도).

## F. Mock 설정(PATCH `/mock`) 실제 동작 상세

- 부분 업데이트: `statusCode/delayMs/headers/body/presetType/presetOptions` 중 **null 은 스킵**.
- `presetType` 이 빈 문자열/공백이면 `null` 로 정규화, 아니면 trim.
- `presetOptions.secretKey` 는 평문일 때 **AES-GCM 암호화 후 저장**(빈 값이면 제거).
- `delayMs` FE 검증 0~10000 ↔ 백엔드 응답 시 `min(delayMs, 10000)` 상한, DeferredResult 하드 타임아웃 15s.

---

## G. 사소한 정정 목록 (문서/코드)

- **G1 에러 코드**: `05` 표의 `408 REQUEST_TIMEOUT` 은 `ErrorCode` enum 에 **없다**. 실제 존재 코드는
  `INVALID_REQUEST, INVALID_TOKEN, FORBIDDEN, LOG_NOT_FOUND, ENDPOINT_NOT_FOUND, NOT_FOUND,
PAYLOAD_TOO_LARGE, CONCURRENT_MODIFICATION, RATE_LIMIT_EXCEEDED, ENDPOINT_LIMIT_EXCEEDED,
PRESET_INVALID_CONFIG, PRESET_SIGNATURE_FAILED, INTERNAL_ERROR`. (지연 타임아웃은 DeferredResult 로 처리)
- **G2 SecurityHeadersFilter**: 캐시 무효화 대상이 `/api/auth`,`/api/user` 인데 앱에 없는 경로 →
  `/api/endpoints/**`, `/api/public/logs/**` 로 교정하거나 블록 제거 권장.
- **G3 표기**: CORS 오리진은 `flashhook.site`(예시 데이터엔 `flashhook.io` 혼재). 로컬 서버 포트 8080,
  Actuator 9090. `05` Base URL/포트 예시 재확인 권장.
- **G4 SSE 동시연결 제한**: `05` 는 "IP당 동시 SSE 5개" 로 기술하나, 코드상 명시적 IP당 상한 로직은
  확인되지 않음(SSE 최대 유지 30분, heartbeat 30s 는 확인됨). 문서 수치 재검증 필요.
