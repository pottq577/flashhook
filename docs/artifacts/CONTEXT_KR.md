# FlashHook 컨텍스트 (Context)

## 1. 도메인 개요 및 핵심 엔티티

FlashHook은 임시 웹훅 수신(Catcher) 서비스입니다. 개발자가 단 1초 만에 임시 엔드포인트 URL을 생성하여 외부 웹훅(결제 연동, 서드파티 통합 등)을 수신하고 디버깅할 수 있도록 돕는 유틸리티입니다. 또한 수신된 웹훅 페이로드를 개발자의 로컬 서버로 다시 재전송하여 매끄러운 디버깅을 지원하는 **웹훅 재전송 (Replay API)** 기능도 제공합니다.

**핵심 엔티티:**

- **Endpoint (`com.flashhook.domain.endpoint.model.Endpoint`)**:
  - 생성된 웹훅 수신 URL을 나타냅니다.
  - MongoDB의 `endpoints` 컬렉션에 저장됩니다.
  - TTL 인덱스를 사용하여 생성 후 24시간이 지나면 자동 만료(삭제)됩니다.
- **WebhookLog (`com.flashhook.domain.webhook.model.WebhookLog`)**:
  - 수신된 HTTP 요청의 페이로드(헤더, 본문, HTTP 메서드)입니다.
  - MongoDB의 `logs` 컬렉션에 저장되며, 24시간 TTL을 갖습니다.
- **MockConfig (`com.flashhook.domain.endpoint.model.MockConfig`)**:
  - `Endpoint` 문서 내부에 임베디드되어 저장됩니다. 외부 호출자에게 반환할 Mock HTTP 응답(상태 코드, 지연 시간, 헤더, 본문)을 정의합니다.
- **정적 프리셋 (Static Preset) (`presets.ts`)**:
  - 고정된 `MockConfig` 튜플에 매핑되는 명명된 시나리오(예: "카카오 — ALREADY_PROCESSED_PAYMENT")입니다.
  - 프리셋을 적용하면 `PATCH /api/endpoints/{id}/mock` 요청이 전송되며, `presetType: null`을 통해 동적 핸들러를 초기화합니다.
- **Dynamic Preset (동적 프리셋)**:
  - **Type A (응답 핸들러)**: 수신된 요청을 파싱하여 특정 값(예: Slack URL Verification의 `challenge` 파라미터)을 즉시 응답에 포함해야 하는 경우. `ResponsePresetHandler`를 통해 처리됩니다.
  - **Type B (발송 파이프라인 핸들러)**: 웹훅 Replay 재전송 시 실시간으로 서명을 생성하여 헤더에 덧붙여야 하는 경우 (예: GitHub `X-Hub-Signature-256`, PortOne V2 `webhook-signature`). `RequestSigningPresetHandler`를 통해 처리되며, `presetOptions.secretKey`는 AES-256으로 안전하게 암호화되어 DB에 저장됩니다.

## 2. 시스템 아키텍처 및 데이터 흐름

이 시스템은 React/Vite 프론트엔드, Spring Boot 백엔드, MongoDB (영속성 + TTL), 그리고 Redis (캐싱 + Rate Limit)로 구성되어 있습니다.

**데이터 흐름 (웹훅 수신부터 대시보드 렌더링까지):**

1. **생성**: 사용자가 엔드포인트를 생성합니다. 백엔드는 Redis를 통해 IP 기반 Rate Limit을 적용하고 `Endpoint`를 MongoDB에 저장합니다.
2. **구독**: 프론트엔드가 `/api/endpoints/{id}/stream` 경로를 통해 SSE에 연결합니다.
3. **데이터 수신**: 외부 서비스 제공자가 웹훅 URL로 POST 요청을 보냅니다.
4. **처리 및 Mocking**: 백엔드는 `WebhookLog`를 MongoDB에 저장합니다. `MockResponseScheduler`는 `MockConfig`를 읽어 설정된 HTTP 응답(지연 시간 포함)을 비동기적으로 반환합니다.
5. **분배 (Distribution)**: 웹훅 수신 이벤트는 **Spring `ApplicationEvent` (`WebhookReceivedEvent`)**로 발행되며, `@Async @EventListener`를 통해 연결된 SSE 클라이언트들에게 비동기적으로 브로드캐스팅됩니다.
6. **렌더링**: 프론트엔드의 `log.store.ts` (Zustand)가 SSE 이벤트를 수신하여 UI에 애니메이션과 함께 렌더링합니다.

**데이터 흐름 (대시보드에서 로컬 서버로 - Replay API):**

1. **Replay 트리거**: 사용자가 대시보드에서 "Replay" 버튼을 클릭하고 로컬 서버 URL(예: ngrok)을 입력합니다.
2. **SSRF 검증**: 백엔드가 대상 URL을 검증합니다. 만약 사설 IP(Private IP), 루프백(Loopback), 또는 링크 로컬(Link-local) 주소(예: AWS IMDS `169.254.169.254`)로 해석될 경우, SSRF(Server-Side Request Forgery) 공격을 방지하기 위해 요청을 차단합니다.
3. **요청 발송**: 백엔드가 저장된 `WebhookLog`를 바탕으로 원본과 완벽히 동일한 HTTP 요청을 재구성하여 대상 URL로 발송합니다.

## 3. 프론트엔드 아키텍처 (React/Vite)

프론트엔드는 **FSD(Feature-Sliced Design)** 아키텍처 패턴을 엄격하게 따릅니다.

- **`app/`**: 글로벌 설정 (`QueryProvider.tsx` 등).
- **`pages/`**: 라우팅 가능한 뷰 (`landing`, `dashboard`, `not-found`).
- **`widgets/`**: 재사용 가능한 복합 UI 블록 (`MockConfigPanel`, `log-viewer`).
- **`features/`**: 특정 상호작용 및 기능.
- **`entities/`**: 핵심 도메인 로직, **Zod** 스키마 (`endpoint.schema.ts`, `log.schema.ts`), API 쿼리.
- **`shared/`**: 공통 UI 컴포넌트, API 클라이언트, `toast.store.ts`.

**상태 관리 (State Management):**

- **TanStack Query**: 서버 상태 (데이터 패칭 및 뮤테이션) 관리. 토큰 만료 및 500 에러를 전역적으로 처리합니다.
- **Zustand**: 클라이언트/UI 상태 관리. `log.store.ts`를 통해 SSE로부터 수신되는 실시간 로그(최대 500개)를 Props 드릴링 없이 관리합니다.

## 4. 백엔드 아키텍처 (Spring Boot 3)

백엔드는 `com.flashhook` 패키지 하위에서 **DDD(Domain-Driven Design) / Package-by-Feature** 구조를 사용합니다.

- **`domain/`**: `endpoint`와 `webhook` 패키지를 포함하며, 각각 `controller`, `service`, `repository`, `model`을 갖습니다.
  - **Controllers**: `EndpointController`, `WebhookReceiveController`, `WebhookStreamController`.
- **`global/`**: 횡단 관심사 (`config`, `exception`, `ratelimit` 등).
- **SSE 로직 (`SseEmitterService`)**: `ConcurrentHashMap`을 사용해 활성화된 연결을 관리하며, 30초마다 하트비트(`ping`)를 전송합니다.
- **Mock 응답 (`MockResponseScheduler`)**: `MockConfig`를 평가하여 외부 호출자에게 지연된 응답이나 커스텀 응답을 반환합니다.
- **보안 (`Replay Service`)**: 사용자가 입력한 URL로 웹훅을 발송할 때, IP 핀닝(IP Pinning)이 적용된 커스텀 `SimpleClientHttpRequestFactory`를 사용하여 DNS Rebinding 및 SSRF 공격을 차단합니다.

## 5. 인프라 및 로컬 개발 환경

- **Redis**: 서버를 스팸/DDoS 공격으로부터 보호하기 위해 (Lua 스크립트를 통한) 고정 윈도우(Fixed Window) Rate Limit을 처리합니다.
- **MongoDB**: 데이터 자동 파기를 위해 TTL 인덱스에 전적으로 의존합니다.
- **로컬 테스트**:
  1. `docker-compose up -d`로 Redis와 MongoDB를 실행합니다.
  2. Cloudflare Tunnel(`cloudflared tunnel --url http://localhost:8080`)을 사용하여 로컬 백엔드를 Slack, Stripe 같은 서드파티 서비스에 외부 노출합니다.
- **프록시 타임아웃**: 프로덕션 프록시(Nginx/AWS ALB)는 유휴 연결을 강제 종료할 수 있으므로, 30초마다 전송되는 SSE 핑(ping)이 이를 방지합니다.

## 6. 개발 가이드라인 (Development Guidelines)

1. **FSD 강제 규칙**: `entities/` 내의 모듈은 절대로 `widgets/`나 `pages/` 패키지를 임포트(import)해서는 안 됩니다.
2. **API 컨트랙트**: 모든 JSON 페이로드는 반드시 `entities/`에 정의된 Zod 스키마를 통해 파싱 및 검증되어야 합니다.
3. **Lombok 사용**: `@Getter`와 `@RequiredArgsConstructor`만 사용하세요. 직렬화 무한 루프를 방지하기 위해 MongoDB 엔티티에 `@Data` 사용은 금지합니다.
4. **Zero Magic (마법 금지)**: 코드는 명시적이어야 하며, 숨겨진 사이드 이펙트를 피하세요. 검증(빌드/린트/테스트)을 통과하기 전까지는 완료를 선언하지 마세요.
