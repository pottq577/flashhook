import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { useToastStore } from "@/shared/lib/toast.store";
import { logger } from "@/shared/lib/logger";

const globalErrorHandler = (error: Error) => {
  logger.error("Global error handler caught an error", error);
  const msg = error.message || "";

  // 1. 만료 또는 권한 없음
  const err = error as { status?: number; code?: string; endpointId?: string };
  if (
    err.status === 401 ||
    err.status === 403 ||
    err.code === "INVALID_TOKEN" ||
    err.code === "ENDPOINT_NOT_FOUND" ||
    msg.includes("INVALID_TOKEN") || 
    msg.includes("ENDPOINT_NOT_FOUND")
  ) {
    if (err.endpointId) {
      localStorage.removeItem(`fh_token_${err.endpointId}`);
    } else {
      // Fallback: remove all if endpointId is somehow missing
      Object.keys(localStorage)
        .filter((key) => key.startsWith("fh_token_"))
        .forEach((key) => localStorage.removeItem(key));
    }
    
    return { authExpired: true };
  }

  // 2. 기타 사용자 귀책 사유 (400, 429 등)
  const jsonMatch = msg.match(/\{.*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.message) {
        return { message: parsed.message };
      }
    } catch (e) {
      logger.warn("Failed to parse custom error message from string", {
        msgLength: msg.length,
        error: e,
      });
    }
  }
  return { message: msg };
};

const showErrorToast = (result: ReturnType<typeof globalErrorHandler>) => {
  if (result?.authExpired) {
    useToastStore.getState().addToast("인증이 만료되었거나 접근할 수 없어요.");
  } else if (result?.message) {
    useToastStore.getState().addToast(result.message);
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const result = globalErrorHandler(error);
      if (!query.meta?.suppressErrorToast) {
        showErrorToast(result);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const result = globalErrorHandler(error);
      if (!mutation.meta?.suppressErrorToast) {
        showErrorToast(result);
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
