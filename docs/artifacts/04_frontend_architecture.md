# FlashHook — 프론트엔드 아키텍처 설계 명세서

> React 19 (Vite 8) + TypeScript / FSD 아키텍처 기반 다크 모드 SPA

## 1. 기술 스택 요약

- **Framework**: React 19.2 (Vite 8.0)
- **Language**: TypeScript 5.7
- **Routing**: react-router-dom v7.17
- **Architecture**: FSD (Feature-Sliced Design)
- **State Management**: Zustand 5.0 (클라이언트), TanStack Query 5.101 (서버)
- **Animation**: Framer Motion 12.40
- **E2E/A11y**: Playwright + Axe
- **Styling**: Vanilla CSS (CSS Modules, 다크 모드 중심)

## 2. 디렉토리 구조 (FSD)

```text
src/
├── app/               // 앱 전역 설정, 진입점 및 프로바이더 (App.tsx, QueryProvider.tsx)
├── pages/             // 페이지 컴포넌트 (라우팅 뷰)
│   ├── landing/, dashboard/, not-found/, about/, legal/
├── widgets/           // 독립적인 UI 블록 (header, endpoint-info, log-viewer, mock-config, legal)
├── features/          // 사용자 상호작용 및 비즈니스 로직 단위 (realtime-logs)
├── entities/          // 도메인 핵심 데이터 구조, 스토어, API (endpoint, log)
└── shared/            // 재사용 가능한 공통 컴포넌트, 유틸, API 클라이언트
    ├── api/           // fetch 래퍼 클라이언트 (client.ts)
    ├── lib/           // 공통 유틸리티 (useIsMobile.ts 등)
    └── ui/            // 공통 UI 요소 (MethodBadge, Toast, CopyButton, ConfirmModal 등)
```

## 3. 핵심 상태 관리 및 캐시 무효화 전략

- **서버 상태 동기화 (TanStack Query)**: REST API 통신은 React Query로 캐싱되며, `lastSeenId` 커서 기반 페이징을 통해 스크롤 시 효율적 데이터를 불러옵니다.
- **전역 상태 관리 (Zustand)**: `useLogStore`를 통해 SSE를 수신하면 React 컴포넌트가 즉시 렌더링되게 관리합니다.
- **Cache Invalidation 전략**:
  - SSE 웹훅 이벤트 수신 시 전체 데이터를 다시 불러오지 않고 Zustand 배열의 **맨 앞(Unshift)**에 직접 주입(Optimistic Update)하여 즉각 반영합니다.
  - 사용자가 로그를 전체 삭제하면 `invalidateQueries`를 호출하여 캐시를 무효화하고 동기화합니다.
  - 만료(TTL) 404, 403 에러 발생 시 글로벌 에러 핸들러가 이를 낚아채 로컬 상태를 지우고 라우팅을 리다이렉트합니다.

## 4. 데이터 흐름 (DashboardPage 기준)

```text
[초기 로그 로드]
    ↓ API: GET /api/endpoints/{id}/logs?lastSeenId={cursor}
    ↓ 응답의 content를 Store에 적재

[SSE 연결 플로우 - features/realtime-logs]
    1. POST /api/endpoints/{id}/stream-token (단기 토큰 발급)
    2. EventSource 연결 (GET /stream?streamToken={streamToken})

[SSE 이벤트 수신]
    ↓ onMessage → Zustand Store 업데이트 (addLog)
    ↓
<DashboardPage> (pages/dashboard/ui)
  ├── <EndpointInfo>, <ConnectionStatus> (상태 및 만료 표시)
  ├── <LogList> (좌측 패널: 슬라이드인 애니메이션으로 새 로그 추가)
  └── Tab Navigation (우측 탭 패널)
        ├── <LogDetail> (로그 상세 보기)
        └── <MockConfigPanel> (Mock 응답 설정 - Phase 2)
```

## 5. 기타 사항

- **API 클라이언트**: `shared/api/client.ts` 페치 래퍼를 통해 런타임에 sessionStorage 토큰을 API 호출마다 자동 주입합니다.
- **접근성(A11y) 검증**: Playwright와 Axe를 연동하여 CI 빌드 시 WCAG 2.1 AA 기준 통과 여부를 검증해 회귀 오류를 방어합니다.
