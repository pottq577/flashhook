# FlashHook — 프론트엔드 아키텍처 (FSD 기반)

> React 19 (Vite 8) + TypeScript / FSD 아키텍처 기반 다크 모드 SPA
> 최종 수정: 2026-06-10

---

## 1. 기술 스택

| 영역      | 기술                        | 이유                                          |
| --------- | --------------------------- | --------------------------------------------- |
| Framework | React 19.2 (Vite 8.0)       | 최신 렌더링 최적화, 압도적인 빌드 속도        |
| Language  | TypeScript 5.7              | 컴파일 타임 안정성 및 강화된 타입 추론        |
| Routing   | react-router-dom v7.17      | 최신 SPA 라우팅 지원                          |
| 아키텍처  | FSD (Feature-Sliced Design) | 비즈니스 로직과 UI 분리, 모듈 확장성 극대화   |
| 상태 관리 | Zustand 5.0                 | 간편하고 성능이 우수한 전역 상태 관리         |
| 비동기    | TanStack Query 5.101        | API 패칭, 캐싱, 서버 상태 동기화              |
| 애니메이션| Framer Motion 12.40         | 매끄러운 뷰 트랜지션 및 마이크로 인터랙션     |
| E2E/A11y  | Playwright + Axe            | CI/CD 연동 자동화 테스트 및 웹 접근성 검사    |
| 스타일    | Vanilla CSS (CSS Modules)   | 다크 모드 디자인 시스템. 충돌 없는 스타일링   |

---

## 2. 디렉토리 구조 (FSD)

```text
src/
├── app/               // 앱 전역 설정, 진입점 및 프로바이더 (App.tsx, QueryProvider.tsx)
├── pages/             // 페이지 컴포넌트 (라우팅 뷰)
│   ├── landing/
│   ├── dashboard/
│   ├── not-found/
│   ├── about/
│   └── legal/
├── widgets/           // 독립적인 UI 블록 (header, endpoint-info, log-viewer, mock-config, legal)
├── features/          // 사용자 상호작용 및 비즈니스 로직 단위 (realtime-logs)
├── entities/          // 도메인 핵심 데이터 구조, 스토어, API (endpoint, log)
└── shared/            // 재사용 가능한 공통 컴포넌트, 유틸, API 클라이언트
    ├── api/           // fetch 래퍼 클라이언트 (client.ts)
    ├── lib/           // 공통 유틸리티 (useIsMobile.ts 등)
    └── ui/            // 공통 UI 요소 (MethodBadge, Toast, CopyButton, ConfirmModal 등)
```

---

## 3. 라우팅

```tsx
// app/App.tsx
<BrowserRouter>
  <main>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </main>
  <CookieBanner />
</BrowserRouter>
```

---

## 4. 핵심 상태 관리 (Zustand & React Query)

초기 기획과 다르게 프로젝트 확장성과 코드의 간결성을 위해 **Zustand**와 **React Query**를 도입했습니다.

### 4.1. 서버 상태 동기화 (TanStack Query)
REST API 통신은 React Query를 통해 캐싱되고 관리됩니다.
- **엔드포인트 정보 및 초기 로그 조회**: `lastSeenId` 커서 기반의 Spring Data Page 객체(`content`, `totalElements`)를 사용하여, 불필요한 네트워크 요청을 줄이고 스크롤 기반의 효율적인 데이터 페칭을 수행합니다.

### 4.2. 전역 상태 관리 (Zustand)
로그 목록 및 선택된 로그 상태는 Zustand 스토어(`useLogStore`)를 통해 관리합니다. SSE 이벤트를 수신하면 Zustand 스토어가 업데이트되며, 이를 구독하는 `widgets`가 반응적으로 렌더링됩니다.

---

## 5. 데이터 흐름 (DashboardPage)

```text
[초기 로그 로드]
    ↓ API: GET /api/endpoints/{id}/logs?lastSeenId={cursor} (Spring Data Page 형식)
    ↓ 응답의 content를 Store에 적재 (totalElements 확인)

[SSE 연결 플로우 - features/realtime-logs]
    1. POST /api/endpoints/{id}/stream-token (Header: X-Access-Token)
       → 단기 일회성 streamToken 발급
    2. EventSource 연결: GET /api/endpoints/{id}/stream?streamToken={streamToken}
       → SSE 수신 대기

[SSE 이벤트 수신]
    ↓ onMessage
Zustand Store 업데이트 (addLog - entities/log/model)
    ↓
<DashboardPage> (pages/dashboard/ui)
  ├── <EndpointInfo>, <ConnectionStatus> (widgets/endpoint-info) - 상태 및 만료 표시
  ├── <LogList> (widgets/log-viewer)      - 좌측: 새로운 로그 슬라이드인 애니메이션
  └── Tab Navigation (DashboardPage)      - 우측: 조건부 렌더링
        ├── <LogDetail> (widgets/log-viewer) - 로그 상세 뷰
        └── <MockConfigPanel> (widgets/mock-config) - Mock 응답 설정 패널 (Phase 2 동작 중)
```

---

## 6. API 클라이언트 및 타입 정의

- **API 클라이언트 (`shared/api/client.ts`)**: fetch 래퍼를 구성하여 런타임에 sessionStorage 토큰을 자동으로 헤더에 주입합니다.
- **도메인 단위 분리 (`entities/`)**: 각 도메인(Endpoint, Log)에 대한 쿼리(`*.queries.ts`)와 타입 모델이 엄격하게 관리되어 프론트/백엔드 규약을 강제합니다.

---

## 7. 접근성 및 테스트 (Playwright)

초기 계획에 없던 Playwright를 도입하여 E2E 테스트 및 접근성(A11y) 검사를 자동화했습니다.
- `@axe-core/playwright`를 통해 WCAG 2.1 AA 기준을 통과하는지 검증합니다.
- CI 파이프라인에서 자동으로 구동되어 회귀 오류(Regression)를 방지합니다.
