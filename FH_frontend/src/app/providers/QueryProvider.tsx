import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useToastStore } from '@/shared/lib/toast.store';

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
      
      // 2. 기타 사용자 귀책 사유 (400, 429 등)
      const jsonMatch = msg.match(/\{.*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) {
            useToastStore.getState().addToast(parsed.message);
            return;
          }
        } catch {
          // ignore
        }
      }
      useToastStore.getState().addToast(msg);
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
