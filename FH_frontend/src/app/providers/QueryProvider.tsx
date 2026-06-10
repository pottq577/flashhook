import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error) => {
      const msg = error.message || '';
      
      // 1. 만료 또는 권한 없음 (강제 홈 이동)
      if (msg.includes('INVALID_TOKEN') || msg.includes('ENDPOINT_NOT_FOUND')) {
        // 모든 엔드포인트 토큰 날리기 (단순화를 위해 전체 clear 또는 특정 처리가능)
        sessionStorage.clear();
        window.location.href = '/';
        return;
      }
      
      // 2. 서버 에러
      if (msg.includes('500') || msg.includes('INTERNAL_ERROR')) {
        alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      
      // 3. 기타 사용자 귀책 사유 (400, 429 등)
      try {
        // "API Error 429: {"code":"RATE_LIMIT_EXCEEDED","message":"..."}" 
        const jsonStr = msg.split('API Error')[1].substring(5);
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) {
          alert(parsed.message);
          return;
        }
      } catch {
        // ignore
      }
      alert(msg);
    }
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
