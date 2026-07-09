# FlashHook — 서비스 기획 및 기능 명세서 (PRD)

> 단기 휘발성 Webhook 테스트 캐처 서비스 및 Mock API 플랫폼
> 최종 수정: 2026-06-11

---

## 1. 프로젝트 배경 및 서비스 컨셉

### 1.1. 초기 아이디어 분석 및 피벗

- **롤체 상점 시스템**: 로직이 흔하고 기술 데모(Toy)로 보일 위험
- **코테 AI 리뷰 플랫폼**: 타 플랫폼 문제 크롤링의 저작권 문제, 단순 GPT API Wrapper
- **플래시 게시판**: Cold Start Problem — 자체 커뮤니티 없이 유령 도시 위험

### 1.2. 피벗 전략 (서비스 핵심 컨셉)

사람들이 모여야 가치가 생기는 서비스가 아닌, **단 한 명이 혼자 써도 100%의 가치를 얻는 '싱글 플레이어 유틸리티(Single-Player Utility)'** 로 방향 전환.
웹훅(Webhook) 연동 테스트 시, **회원가입 없이 1초 만에 임시 엔드포인트 URL을 생성**하고 **24시간 뒤 모든 로그와 함께 완전 파기**되는 유틸리티 서비스를 제공합니다.

### 1.3. 차별화 전략 및 서비스 목표

- **vs Postman**: 무겁고 복잡한 '항공모함' vs 1초 URL 발급 '전동 킥보드' 포지셔닝
- **vs Webhook.site**: 빈 폼만 제공 vs **K-API 프리셋**(토스페이먼츠, 카카오 등) 원클릭 제공
- **vs AI 에이전트**: 코드는 AI가 짜주지만, 실제 트래픽/네트워크 통신 테스트는 대체 불가
- **서비스 목표**: 토이 프로젝트로 시작하되 실제 배포 및 서비스 운영 목표. CRUD를 넘어선 실시간/대규모 인프라 경험 증명.

---

## 2. 타겟 유저 및 MVP 스코프

### 2.1. 타겟 유저

| 타겟 그룹 | 주요 목적                  | 핵심 행동                      | 서버 역할             |
| --------- | -------------------------- | ------------------------------ | --------------------- |
| FE 개발자 | 가짜 API 껍데기 확보       | 응답(상태코드, JSON) 미리 세팅 | 세팅된 가짜 응답 반환 |
| BE 개발자 | 외부 송신 데이터 원본 확인 | 외부 서비스에 URL 등록 후 대기 | 실시간 로그 화면 출력 |

### 2.2. MVP 스코프 (Phase 1)

핵심 기술 챌린지(실시간 통신, 휘발성 데이터)에 집중.

- 엔드포인트 생성 (1초, 비로그인)
- 웹훅 수신 및 로그 저장
- 수신된 웹훅 재전송 (Replay API) 및 SSRF 보안 차단
- 대시보드에서 실시간 로그 확인 (SSE)
- 24시간 자동 파기 (MongoDB TTL Index)

> ⚠️ **구현 현황 (기획 이후 추가된 기능)**: 현재 코드에는 초기 MVP 스코프를 넘어선 기능이 구현되어 있다.
> 자세한 대조는 `docs/artifacts/07_implementation_sync.md` 참조.
>
> - **동적 프리셋**: Slack URL Verification(응답 echo), GitHub `X-Hub-Signature-256` / PortOne
>   `webhook-signature`(Replay 시 서명 주입) — ADR-0002 참고.
> - **관리자 대시보드**(`/admin`, `X-Admin-Token`): 메트릭, 의심 엔드포인트, IP 블랙리스트 관리.
> - **공개 로그 공유**(`/session/{logId}` + `GET /api/public/logs/{logId}`): 마스킹된 로그 공유.

---

## 3. 핵심 기술 스택

| 영역          | 기술                               | 선택 이유                                                       |
| ------------- | ---------------------------------- | --------------------------------------------------------------- |
| Backend       | Java 21 + Spring Boot 4.0.7        | 최신 LTS 및 프레임워크 도입으로 성능 최적화 및 최신 스펙 활용   |
| Frontend      | React 19 (Vite 8) + TS             | 최신 React 19 기능 활용, Zustand/React Query 도입, FSD 아키텍처 |
| Main DB       | MongoDB                            | 스키마리스 Payload, JOIN 불필요, 쓰기 폭증, TTL Index 자동 파기 |
| Cache/Session | Redis                              | Rate Limiting, IP 블랙리스트, 엔드포인트 캐시                   |
| 실시간 통신   | SSE (Server-Sent Events)           | 단방향 푸시 충분. 구현 단순. Spring 지원 우수                   |
| 배포 / CI/CD  | CI: GitHub Actions, CD: AWS (예정) | Playwright E2E 통합 (CI 구축 완료, CD 파이프라인은 구축 예정)   |

> ⚠️ **최신화**: Redis 의 "SSE 인증 토큰(Stream Token) 관리" 는 낡은 서술이다. 현재 인증은 HttpOnly
> 쿠키 방식이며 `stream-token` 은 구현되지 않았다(`07_implementation_sync.md` §A1). Redis 는 Rate Limit
> 카운터·IP 블랙리스트·엔드포인트 캐시에 쓰인다.

**MongoDB 선택 근거 (vs PostgreSQL)**:
이 도메인의 데이터는 스키마가 없고 JOIN이 불필요하며 쓰기 작업이 폭증하는 특징이 있어 RDBMS가 비효율적이라 판단했습니다. 폴리그랏 퍼시스턴스 관점에서 MongoDB를 선택했고, TTL Index를 통해 배치 서버 없이 대용량 데이터 파기 문제를 해결합니다.

---

## 4. UI/UX 화면 구성 (Frontend)

React (Vite) + TypeScript 기반으로 FSD 아키텍처를 적용하여 구축합니다. 기본 테마는 다크 모드(개발자 툴 감성)입니다.

### 4.1. 페이지 목록

| #   | 페이지      | 경로                      | 설명                                     |
| --- | ----------- | ------------------------- | ---------------------------------------- |
| 1   | 랜딩 페이지 | `/`                       | 서비스 소개 + 엔드포인트 생성            |
| 2   | 대시보드    | `/dashboard/{endpointId}` | 실시간 로그 모니터링 및 Mock 설정 (핵심) |
| 3   | 404 / 만료  | `/not-found`              | 잘못된 URL 또는 만료된 엔드포인트        |
| 4   | 서비스 소개 | `/about`                  | 서비스 소개 페이지                       |
| 5   | 문의/약관   | `/contact`, `/terms`, `/privacy`, `/privacy-eu` | 부가/법무 정보 페이지 |
| 6   | 공개 로그 공유 | `/session/{logId}`     | 마스킹된 로그 공유 뷰 (인증 불필요)      |
| 7   | 관리자      | `/admin/login`, `/admin`  | 운영 대시보드 (`X-Admin-Token` 가드)     |

> ⚠️ **최신화**: `/session/{logId}`, `/admin`, `/privacy-eu` 는 초기 기획표에 없던 실제 구현 라우트다
> (`07_implementation_sync.md` §C~E).

### 4.2. 주요 화면 구성 상세

**[랜딩 페이지 (`/`)]**

- **동작**: Label 입력 후 생성 버튼 클릭 시 `POST /api/endpoints` 호출 → 응답 토큰 저장 후 대시보드 진입.
- **구성 요소**: 서비스 한 줄 소개, 타겟 유저별 사용 사례, 원클릭 생성 버튼.

**[대시보드 (`/dashboard/{endpointId}`)]**

- **레이아웃**: 좌우 Split View (좌: 로그 목록, 우: 탭 기반 상세 뷰). 모바일은 Bottom Sheet 형태.
- **상단 정보**: 만료 카운트다운(실시간 감소), Webhook URL 복사, SSE 연결 상태.
- **좌측 패널 (실시간 로그)**: HTTP Method 배지, Body 요약, 수신 시각. SSE를 통해 애니메이션과 함께 새 로그 상단 추가.
- **우측 패널 (상세 및 설정)**:
  - **로그 상세 탭**: Headers 테이블, 포맷팅된 Body(JSON), Query Params, 메타 정보.
  - **Mock 설정 탭**: Status Code, Delay(ms), Headers, Body, Preset 주입 설정.

**[주요 FE 컴포넌트 구조 (FSD)]**

- `app/`: 앱 전역 라우팅 및 프로바이더
- `pages/`: 라우트 단위 페이지 (`landing/ui`, `dashboard/ui` 등)
- `widgets/`: 독립적인 UI 블록 (`log-viewer/ui`, `mock-config/ui` 등)
- `features/`: 실시간 로그 수신 등 특정 기능 (`realtime-logs/`)
- `entities/`: 도메인 모델 및 API (`endpoint/`, `log/`)
- `shared/`: 공통 컴포넌트 (`api/`, `ui/`)
