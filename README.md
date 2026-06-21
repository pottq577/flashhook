<div align="center">

# ⚡ FlashHook

**1초 만에 생성하는 개발자용 웹훅 샌드박스 및 Mock API 서비스**

[![FlashHook CI](https://github.com/pottq577/flashhook/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pottq577/flashhook/actions/workflows/ci.yml)
[![hits](https://myhits.vercel.app/api/hit/https%3A%2F%2Fgithub.com%2Fpottq577%2Fflashhook?color=blue&label=hits&size=small)](https://myhits.vercel.app)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/pottq577/flashhook?utm_source=oss&utm_medium=github&utm_campaign=pottq577%2Fflashhook&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
![Created](https://img.shields.io/badge/Created-2026.06.08-blue)
[![Last Commit](https://img.shields.io/github/last-commit/pottq577/flashhook?color=blue)](https://github.com/pottq577/flashhook/commits/main)

FlashHook은 회원가입 없이 바로 쓸 수 있는 엔드포인트를 제공해서,<br/>
들어오는 웹훅 데이터를 실시간으로 확인하고 외부 API의 예외 응답을 직접 테스트해 볼 수 있는 유틸리티예요.

</div>

---

## 지금 바로 사용하기

[![Visit FlashHook](https://img.shields.io/badge/🚀_Visit_FlashHook_Live_Service-171717?style=for-the-badge&logo=vercel&logoColor=white)](https://flashhook.site)

로컬 설치 없이 웹훅 수신 URL을 생성하고, 대시보드에서 요청 로그를 바로 확인할 수 있어요.

## 기획 배경

### Problem

토스페이먼츠나 카카오 로그인 같은 외부 API를 연동할 때, 한 번쯤 이런 불편함을 겪어보셨을 거예요.

1. 상대방이 보내는 웹훅 데이터 형식을 보려면 매번 `ngrok`으로 로컬 포트를 열거나 테스트 서버를 배포해야 해요.
2. 타사 API가 점검 중이거나 타임아웃이 났을 때 내 서버가 잘 버티는지 테스트하고 싶은데, 진짜 서버를 고의로 망가뜨릴 방법이 없어요.

### Solution

그래서 누구나 **클릭 한 번으로 임시 URL을 발급받아 데이터를 실시간으로 확인**하고, **"이 URL은 잠시 뒤에 에러를 뱉어줘"라고 조작할 수 있는 가짜 서버**를 만들었어요.

## 핵심 기능 3종

### 1. Webhook Catcher

> **"상대방이 나한테 정확히 어떤 데이터를 보내고 있는 걸까?"**

- **활용 예시**: 결제 성공 시 날아오는 JSON 구조를 정확히 파악해서 파싱 코드를 작성하고 싶을 때.
- **워크플로우**: 임시 웹훅 URL 생성 → 외부 서비스에 수신지 등록 → 대시보드에서 Payload, Headers, Query를 실시간 확인.

### 2. K-API Mock (응답 조작 가능한 가짜 API 서버)

> **"상대방 서버에 문제가 생기면 내 서버는 안 터지고 잘 버틸 수 있을까?"**

- **활용 예시**: 카카오 로그인 서버가 지연되거나 실패할 때, 내 서버의 타임아웃/에러 처리를 검증하고 싶을 때.
- **워크플로우**: 프리셋 또는 수동 Mock 설정 → 호출 URL을 FlashHook 주소로 변경 → 원하는 상태 코드, 지연, 본문으로 응답 확인.

**국내외 주요 서비스 6종의 공식 응답 스펙을 그대로 재현하는 프리셋을 제공해요.**

| 서비스           | 테스트 가능한 시나리오                                                            |
| ---------------- | --------------------------------------------------------------------------------- |
| **카카오**       | OAuth 토큰 발급 성공/실패, `invalid_client`, `invalid_grant`, 응답 지연 (3s / 5s) |
| **토스페이먼츠** | 결제 성공, 이미 처리된 결제, 잔액 부족, 한도 초과, 응답 지연                      |
| **포트원 V2**    | 결제 성공/실패, 웹훅 서명 자동 생성 후 Replay 발송                                |
| **솔라피**       | SMS 발송 성공/실패, 잔액 부족                                                     |
| **GitHub**       | `X-Hub-Signature-256` 서명 자동 생성 후 Replay 발송                               |
| **Slack**        | URL Verification `challenge` 자동 응답                                            |

### 3. Replay API

> **"로컬 서버가 꺼져있을 때 들어온 웹훅을 나중에 다시 테스트해 볼 순 없을까?"**

- **활용 예시**: 터널링이 끊겨 웹훅을 놓쳤을 때, 동일한 페이로드를 로컬 서버로 다시 보내 디버깅하고 싶을 때.
- **워크플로우**: 과거 로그 선택 → 재전송 대상 URL 입력 → FlashHook이 저장된 요청을 다시 발송.

## 아키텍처

```mermaid
sequenceDiagram
    participant WebhookSender as Third-party App
    participant Spring as Backend (Spring Boot)
    participant Redis as Redis (Rate Limit)
    participant Mongo as MongoDB (TTL Data)
    participant FE as Frontend (React + SSE)

    FE->>Spring: 1. Subscribe to Endpoint (SSE)
    WebhookSender->>Spring: 2. Request /api/hooks/{endpointId}
    Spring->>Redis: 3. Check Rate Limits
    Spring->>Mongo: 4. Save WebhookLog
    Spring-->>FE: 5. Push Event (SSE)
    FE->>FE: 6. Render Log in Dashboard
    Spring-->>WebhookSender: 7. Return Mock Response (Custom Status/Body/Delay)
```

- **Backend:** Java 21, Spring Boot 3.5.15
- **Frontend:** React 19, TypeScript, Vite, Zustand, TanStack Query, React Router, Framer Motion, Playwright + Axe, FSD 아키텍처
- **Database:** MongoDB TTL, Redis
- **Infra:** Docker, SSE

자세한 구조는 [System Context](docs/artifacts/CONTEXT.md)와 [System Architecture](docs/artifacts/04_system_architecture.md)를 참고해 주세요.

## 기술적 챌린지

### Backend

- **트래픽 남용 방지**: 회원가입 없이 URL을 만들 수 있어 요청 빈도 제한과 프록시 환경의 클라이언트 IP 해석을 함께 설계했어요.
- **스토리지 보호**: 비정형 웹훅 로그가 무한히 쌓이지 않도록 TTL과 앱 레벨 저장량 제한을 적용했어요.
- **수신/브로드캐스트 분리**: 웹훅 수신 경로와 SSE 전송 경로를 비동기 이벤트로 분리해 지연 전파를 줄였어요.
- **동적 응답 프리셋**: Slack, GitHub, PortOne처럼 요청 파싱이나 서명 처리가 필요한 프리셋을 전략 패턴으로 분리했어요.
- **Replay SSRF 방어**: 외부 발송 전 목적지 주소를 검증하고 내부망 접근과 DNS Rebinding 위험을 차단했어요.

### Frontend

- **Polling 없는 실시간 로그**: EventSource 기반 SSE 연결로 수신 즉시 대시보드에 로그를 반영해요.
- **대량 로그 렌더링 최적화**: 가상화 리스트로 많은 로그가 쌓여도 UI가 멈추지 않게 했어요.
- **상태 관리 분리**: FSD 구조, Zustand, TanStack Query로 UI 상태와 서버 상태를 분리했어요.
- **자동화된 품질 검증**: Playwright와 Axe로 주요 흐름과 접근성 회귀를 검사해요.

보안 설계는 [Security Overview](docs/security/SECURITY_OVERVIEW.md), 더 자세한 설계 의도는 [System Context (EN)](docs/artifacts/CONTEXT.md) 또는 [System Context (KR)](docs/artifacts/CONTEXT_KR.md)를 참고해 주세요.

## 데이터 보존 및 개인정보 안내

FlashHook은 장기 보관 서비스가 아니라 임시 디버깅 도구예요.

- 엔드포인트와 로그는 생성 후 24시간이 지나면 자동으로 삭제돼요.
- 대시보드에서 엔드포인트와 로그를 직접 삭제할 수 있어요.
- 웹훅 Payload에 제3자 개인정보가 섞일 수 있어요. 테스트 데이터를 쓰는 걸 권장해요.

자세한 기준은 [개인정보처리방침](docs/legal/PRIVACY_POLICY.md)과 [서비스 이용약관](docs/legal/TERMS_OF_SERVICE.md)을 참고해 주세요.

## 로컬 개발 환경

1. 인프라 실행

```bash
docker-compose up -d
```

2. 백엔드 실행

```bash
cd FH_backend
./gradlew bootRun
```

3. 프론트엔드 실행

```bash
cd FH_frontend
npm install
npm run dev
```

4. 브라우저에서 `http://localhost:5173` 접속

자세한 개발 환경 구성은 [Development Guide](docs/DEVELOPMENT.md)를 참고해 주세요.

## 문서 모음

| 문서                                                              | 설명                              |
| ----------------------------------------------------------------- | --------------------------------- |
| [Product & Features](docs/artifacts/01_product_and_features.md)   | 제품 목표와 핵심 기능             |
| [Mock API Features](docs/artifacts/02_mock_api_features.md)       | K-API Mock 프리셋 설계            |
| [K-API Presets Spec](docs/artifacts/03_kapi_presets_ssot.md)      | 6대 K-API 공식 웹훅 명세 (SSOT)   |
| [System Architecture](docs/artifacts/04_system_architecture.md)   | 시스템 구조와 데이터 흐름         |
| [API Spec](docs/artifacts/05_api_spec.md)                         | API 엔드포인트와 요청/응답 스키마 |
| [Error Dictionary](docs/artifacts/06_error_dictionary.md)         | 공통 에러 코드                    |
| [Security Overview](docs/security/SECURITY_OVERVIEW.md)           | 공개 가능한 보안 설계 개요        |
| [Development Guide](docs/DEVELOPMENT.md)                          | 로컬 개발 및 검증 가이드          |
| [ADR 0001](docs/adr/0001-preset-catalog-lives-in-fe-constants.md) | 프리셋 카탈로그 위치 결정         |
| [ADR 0002](docs/adr/0002-dynamic-preset-split-into-two-types.md)  | 동적 프리셋 타입 분리 결정        |
| [Privacy Policy](docs/legal/PRIVACY_POLICY.md)                    | 개인정보처리방침                  |
| [Terms of Service](docs/legal/TERMS_OF_SERVICE.md)                | 서비스 이용약관                   |
| [License](LICENSE)                                                | 라이선스                          |

## 라이선스

현재 레포의 [LICENSE](LICENSE)는 MIT License예요.

## 문의/이슈

버그 제보, 개선 제안, 질문은 [GitHub Issues](https://github.com/pottq577/flashhook/issues) 또는 [Google Form](https://forms.gle/fu21EPmxTu3h9Pob8)에 남겨주세요.
