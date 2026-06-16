import { QueryClient, QueryCache } from "@tanstack/react-query";
import { useToastStore } from "@/shared/lib/toast.store";
import { logger } from "@/shared/lib/logger";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error) => {
      logger.error("Query global error handler caught an error", error);
      const msg = error.message || "";

      // 1. 만료 또는 권한 없음 (강제 홈 이동)
      if (msg.includes("INVALID_TOKEN") || msg.includes("ENDPOINT_NOT_FOUND")) {
        // 모든 엔드포인트 토큰 날리기 (단순화를 위해 전체 clear 또는 특정 처리가능)
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith("fh_token_"))
          .forEach((key) => sessionStorage.removeItem(key));
        window.location.href = "/";
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
        } catch (e) {
          logger.warn("Failed to parse custom error message from string", {
            msgLength: msg.length,
            error: e,
          });
        }
      }
      useToastStore.getState().addToast(msg);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
