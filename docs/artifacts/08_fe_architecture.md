# FlashHook — 프론트엔드 아키텍처

> React (Vite) + TypeScript / 다크 모드 SPA
> 최종 수정: 2026-06-08

---

## 1. 기술 스택

| 영역      | 기술                        | 이유                                          |
| --------- | --------------------------- | --------------------------------------------- |
| Framework | React 18+ (Vite)            | RN 경험 기반 자연스러운 전환. Vite = 빠른 HMR |
| Language  | TypeScript                  | 타입 안정성. API 응답 타입 정의               |
| Routing   | React Router v6             | SPA 3페이지 라우팅                            |
| 상태 관리 | useState + Custom Hooks     | 3페이지 + 얕은 트리 → 전역 상태 불필요        |
| 스타일    | Vanilla CSS (CSS Variables) | 다크 모드 디자인 시스템. 프레임워크 불필요    |

---

## 2. 디렉토리 구조

```
src/
├── main.tsx                           // React DOM 렌더링 진입점
├── App.tsx                            // React Router 라우팅 정의
│
├── pages/
│   ├── LandingPage.tsx                // 서비스 소개 + 엔드포인트 생성
│   ├── DashboardPage.tsx              // 실시간 로그 모니터링 (핵심)
│   └── NotFoundPage.tsx               // 404 / 만료 안내
│
├── components/
│   ├── common/
│   │   ├── Header.tsx                 // 공통 헤더 (로고)
│   │   ├── CopyButton.tsx             // URL 복사 + 토스트 알림
│   │   ├── MethodBadge.tsx            // HTTP Method 컬러 배지
│   │   ├── ConfirmModal.tsx           // 삭제 확인 모달
│   │   └── Toast.tsx                  // 토스트 알림
│   └── dashboard/
│       ├── EndpointInfo.tsx           // 상단 정보 바 (URL, 카운트다운, 상태)
│       ├── CountdownTimer.tsx         // 만료 카운트다운 타이머
│       ├── ConnectionStatus.tsx       // SSE 연결 상태 표시 (●/⚠️)
│       ├── LogList.tsx                // 좌측 로그 목록 (SSE 실시간 업데이트)
│       ├── LogItem.tsx                // 개별 로그 항목 (배지 + bodyPreview)
│       ├── LogDetail.tsx              // 우측 상세 패널 (headers, body, meta)
│       └── JsonViewer.tsx             // JSON syntax highlight + 포맷팅
│
├── hooks/
│   ├── useSSE.ts                      // SSE 연결/재연결/heartbeat 관리
│   ├── useEndpoint.ts                 // 엔드포인트 API + 토큰 초기화
│   └── useLogs.ts                     // 로그 조회 API
│
├── api/
│   ├── client.ts                      // fetch 래퍼 (토큰 헤더 자동 주입)
│   ├── endpoints.ts                   // 엔드포인트 API 함수
│   └── logs.ts                        // 로그 API 함수
│
├── types/
│   ├── endpoint.ts                    // Endpoint 인터페이스
│   └── log.ts                         // WebhookLog 인터페이스
│
├── utils/
│   └── tokenStorage.ts               // sessionStorage 토큰 CRUD
│
└── styles/
    └── index.css                      // 다크 모드 디자인 시스템 (CSS Variables)
```

---

## 3. 라우팅

```typescript
// App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
</BrowserRouter>
```

---

## 4. 핵심 Custom Hooks

### 4.1. useEndpoint — 토큰 초기화 + API

```typescript
// hooks/useEndpoint.ts
export function useEndpoint(endpointId: string) {
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. URL에서 토큰 추출 → sessionStorage 저장 → URL 정리
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      tokenStorage.set(endpointId, token);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // 2. 엔드포인트 정보 조회
    fetchEndpoint(endpointId)
      .then(setEndpoint)
      .catch(() => navigate("/not-found"))
      .finally(() => setLoading(false));
  }, [endpointId]);

  return { endpoint, loading };
}
```

> 토큰 처리 로직이 훅 내부에 캡슐화 → DashboardPage.tsx는 `useEndpoint(id)` 한 줄.

### 4.2. useSSE — SSE 연결 관리

```typescript
// hooks/useSSE.ts
export function useSSE(
  endpointId: string,
  onMessage: (log: WebhookLog) => void,
) {
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  useEffect(() => {
    const token = tokenStorage.get(endpointId);
    const url = `${API_BASE}/endpoints/${endpointId}/stream?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setStatus("connected");

    eventSource.onmessage = (event) => {
      const log: WebhookLog = JSON.parse(event.data);
      onMessage(log);
    };

    eventSource.onerror = () => {
      setStatus("disconnected");
      // EventSource 자동 재연결 (브라우저 내장)
    };

    return () => eventSource.close();
  }, [endpointId]);

  return { status };
}
```

### 4.3. useLogs — 로그 상태 관리

```typescript
// hooks/useLogs.ts
export function useLogs(endpointId: string) {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WebhookLogDetail | null>(null);

  // SSE에서 새 로그 수신 시 상단 추가
  const addLog = useCallback((log: WebhookLog) => {
    setLogs((prev) => [log, ...prev]);
  }, []);

  // 로그 클릭 → 상세 조회
  const selectLog = useCallback(
    async (logId: string) => {
      const detail = await fetchLogDetail(endpointId, logId);
      setSelectedLog(detail);
    },
    [endpointId],
  );

  return { logs, selectedLog, addLog, selectLog };
}
```

---

## 5. 데이터 흐름 (DashboardPage)

```
DashboardPage
  ├── useEndpoint(endpointId)     // 토큰 초기화 + 엔드포인트 정보
  ├── useLogs(endpointId)         // 로그 목록 상태 관리
  └── useSSE(endpointId, addLog)  // SSE → 새 로그 수신 → addLog()
        │
        ├── <EndpointInfo />      // 상단: URL, 카운트다운, 상태
        ├── <LogList />           // 좌측: 로그 목록 (logs 배열)
        │     └── <LogItem />     //   └── 개별 항목 (클릭 → selectLog)
        └── <LogDetail />         // 우측: 선택된 로그 상세 (selectedLog)
```

```
[SSE 이벤트 수신]
    ↓ onMessage
useLogs.addLog(log)
    ↓ setState
logs 배열 상단에 추가
    ↓ re-render
LogList → 새 LogItem 슬라이드인 애니메이션
```

---

## 6. API 클라이언트

```typescript
// api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  endpointId?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 토큰 자동 주입
  if (endpointId) {
    const token = tokenStorage.get(endpointId);
    if (token) {
      (headers as Record<string, string>)["X-Access-Token"] = token;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }

  return response.json();
}
```

---

## 7. 타입 정의

```typescript
// types/endpoint.ts
export interface Endpoint {
  endpointId: string;
  label: string | null;
  webhookUrl: string;
  createdAt: string;
  expiresAt: string;
  logCount: number;
  logSizeBytes: number;
}

export interface EndpointCreateResponse {
  endpointId: string;
  accessToken: string;
  label: string | null;
  webhookUrl: string;
  dashboardUrl: string;
  expiresAt: string;
  limits: {
    maxLogs: number;
    maxSizeMb: number;
  };
}
```

```typescript
// types/log.ts
export interface WebhookLog {
  logId: string;
  method: string;
  contentType: string;
  clientIp: string;
  bodyPreview: string;
  bodySize: number;
  receivedAt: string;
}

export interface WebhookLogDetail extends WebhookLog {
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
}
```
