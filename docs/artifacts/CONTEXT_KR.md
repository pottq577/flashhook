# FlashHook 컨텍스트 (Context)

## 1. 도메인 개요 및 핵심 엔티티

FlashHook은 임시 웹훅 수신(Catcher) 서비스예요. 개발자가 단 1초 만에 임시 엔드포인트 URL을 만들고, 외부 웹훅(결제 연동, 서드파티 통합 등)을 받아 디버깅할 수 있게 돕는 유틸리티예요. 수신된 웹훅 페이로드를 개발자의 로컬 서버로 다시 보내는 **웹훅 재전송 (Replay API)** 기능도 제공해요.

**핵심 엔티티:**

- **Endpoint (`com.flashhook.domain.endpoint.model.Endpoint`)**:
  - 생성된 웹훅 수신 URL을 나타내요.
  - MongoDB의 `endpoints` 컬렉션에 저장해요.
  - TTL 인덱스를 사용해 생성 후 24시간이 지나면 자동 만료(삭제)돼요.
- **WebhookLog (`com.flashhook.domain.webhook.model.WebhookLog`)**:
  - 수신된 HTTP 요청의 페이로드(헤더, 본문, HTTP 메서드)예요.
  - MongoDB의 `logs` 컬렉션에 저장하고, 24시간 TTL을 가져요.
- **MockConfig (`com.flashhook.domain.endpoint.model.MockConfig`)**:
  - `Endpoint` 문서 내부에 임베디드해 저장해요. 외부 호출자에게 돌려줄 Mock HTTP 응답(상태 코드, 지연 시간, 헤더, 본문)을 정의해요.
- **정적 프리셋 (Static Preset) (`presets.ts`)**:
  - 고정된 `MockConfig` 튜플에 매핑되는 이름 있는 시나리오(예: "카카오 — ALREADY_PROCESSED_PAYMENT")예요.
  - 프리셋을 적용하면 `PATCH /api/endpoints/{id}/mock` 요청을 보내고, `presetType: null`로 동적 핸들러를 초기화해요.
- **Dynamic Preset (동적 프리셋)**:
  - **Type A (응답 핸들러)**: 수신된 요청을 파싱해 특정 값(예: Slack URL Verification의 `challenge` 파라미터)을 즉시 응답에 포함해야 할 때 사용해요. `ResponsePresetHandler`가 처리해요.
  - **Type B (발송 파이프라인 핸들러)**: 웹훅 Replay 재전송 시 실시간으로 서명을 만들고 헤더에 덧붙여야 할 때 사용해요. 예: GitHub `X-Hub-Signature-256`, PortOne V2 `webhook-signature`. `RequestSigningPresetHandler`가 처리하고, `presetOptions.secretKey`는 AES-256으로 암호화해 DB에 저장해요.

## 2. 시스템 아키텍처 및 데이터 흐름

이 시스템은 React/Vite 프론트엔드, Spring Boot 백엔드, MongoDB(영속성 + TTL), Redis(캐싱 + Rate Limit)로 구성돼요.

**데이터 흐름 (웹훅 수신부터 대시보드 렌더링까지):**

1. **생성**: 사용자가 엔드포인트를 만들어요. 백엔드는 Redis로 IP 기반 Rate Limit을 적용하고 `Endpoint`를 MongoDB에 저장해요.
2. **구독**: 프론트엔드가 `/api/endpoints/{id}/stream` 경로로 SSE에 연결해요.
3. **데이터 수신**: 외부 서비스 제공자가 웹훅 URL로 POST 요청을 보내요.
4. **처리 및 Mocking**: 백엔드는 `WebhookLog`를 MongoDB에 저장해요. `MockResponseScheduler`는 `MockConfig`를 읽어 설정된 HTTP 응답(지연 시간 포함)을 비동기로 돌려줘요.
5. **분배 (Distribution)**: 웹훅 수신 이벤트는 **Spring `ApplicationEvent` (`WebhookReceivedEvent`)**로 발행하고, `@Async @EventListener`로 연결된 SSE 클라이언트에게 비동기로 브로드캐스트해요.
6. **렌더링**: 프론트엔드의 `log.store.ts`(Zustand)가 SSE 이벤트를 받아 UI에 애니메이션과 함께 렌더링해요.

**데이터 흐름 (대시보드에서 로컬 서버로 - Replay API):**

1. **Replay 트리거**: 사용자가 대시보드에서 "Replay" 버튼을 클릭하고 로컬 서버 URL(예: ngrok)을 입력해요.
2. **SSRF 검증**: 백엔드가 대상 URL을 검증해요. 사설 IP(Private IP), 루프백(Loopback), 링크 로컬(Link-local) 주소(예: AWS IMDS `169.254.169.254`)로 해석되면 SSRF(Server-Side Request Forgery) 공격을 막기 위해 요청을 차단해요.
3. **요청 발송**: 백엔드가 저장된 `WebhookLog`를 바탕으로 원본과 같은 HTTP 요청을 재구성해 대상 URL로 보내요.

## 3. 프론트엔드 아키텍처 (React/Vite)

프론트엔드는 **FSD(Feature-Sliced Design)** 아키텍처 패턴을 엄격하게 따라요.

- **`app/`**: 글로벌 설정 (`QueryProvider.tsx` 등).
- **`pages/`**: 라우팅 가능한 뷰 (`landing`, `dashboard`, `not-found`).
- **`widgets/`**: 재사용 가능한 복합 UI 블록 (`MockConfigPanel`, `log-viewer`).
- **`features/`**: 특정 상호작용 및 기능.
- **`entities/`**: 핵심 도메인 로직, **Zod** 스키마 (`endpoint.schema.ts`, `log.schema.ts`), API 쿼리.
- **`shared/`**: 공통 UI 컴포넌트, API 클라이언트, `toast.store.ts`.

**상태 관리 (State Management):**

- **TanStack Query**: 서버 상태(데이터 패칭 및 뮤테이션)를 관리해요. 토큰 만료와 500 에러를 전역적으로 처리해요.
- **Zustand**: 클라이언트/UI 상태를 관리해요. `log.store.ts`로 SSE에서 받은 실시간 로그를 Props 드릴링 없이 관리해요.

## 4. 백엔드 아키텍처 (Spring Boot 3)

백엔드는 `com.flashhook` 패키지 하위에서 **DDD(Domain-Driven Design) / Package-by-Feature** 구조를 사용해요.

- **`domain/`**: `endpoint`와 `webhook` 패키지를 포함하고, 각각 `controller`, `service`, `repository`, `model`을 가져요.
  - **Controllers**: `EndpointController`, `WebhookReceiveController`, `WebhookStreamController`.
- **`global/`**: 횡단 관심사 (`config`, `exception`, `ratelimit` 등).
- **SSE 로직 (`SseEmitterService`)**: `ConcurrentHashMap`으로 활성 연결을 관리하고, 30초마다 하트비트(`ping`)를 보내요.
- **Mock 응답 (`MockResponseScheduler`)**: `MockConfig`를 평가해 외부 호출자에게 지연 응답이나 커스텀 응답을 돌려줘요.
- **보안 (`Replay Service`)**: 사용자가 입력한 URL로 웹훅을 보낼 때 IP Pinning을 적용한 커스텀 `SimpleClientHttpRequestFactory`로 DNS Rebinding과 SSRF 공격을 차단해요.

## 5. 인프라 및 로컬 개발 환경

- **Redis**: 서버를 스팸/DDoS 공격으로부터 보호하기 위해 요청 빈도 제한을 처리해요.
- **MongoDB**: 데이터 자동 파기는 TTL 인덱스에 맡겨요.
- **로컬 테스트**:
  1. `docker-compose up -d`로 Redis와 MongoDB를 실행해요.
  2. Cloudflare Tunnel(`cloudflared tunnel --url http://localhost:8080`)로 로컬 백엔드를 Slack, Stripe 같은 서드파티 서비스에 외부 노출해요.
- **프록시 타임아웃**: 프로덕션 프록시(Nginx/AWS ALB)는 유휴 연결을 강제 종료할 수 있어요. 30초마다 보내는 SSE 핑(ping)으로 이를 방지해요.

## 6. 개발 가이드라인 (Development Guidelines)

1. **FSD 강제 규칙**: `entities/` 내 모듈은 `widgets/`나 `pages/` 패키지를 임포트(import)하면 안 돼요.
2. **API 컨트랙트**: 모든 JSON 페이로드는 `entities/`에 정의된 Zod 스키마로 파싱하고 검증해야 해요.
3. **Lombok 사용**: `@Getter`와 `@RequiredArgsConstructor`만 사용하세요. 직렬화 무한 루프를 막기 위해 MongoDB 엔티티에 `@Data` 사용은 금지해요.
4. **Zero Magic (마법 금지)**: 코드는 명시적으로 작성하고, 숨겨진 사이드 이펙트를 피하세요. 검증(빌드/린트/테스트)을 통과하기 전까지는 완료를 선언하지 마세요.
