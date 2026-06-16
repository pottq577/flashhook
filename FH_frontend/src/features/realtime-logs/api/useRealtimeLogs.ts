import { useSSE } from "@/entities/log";
import { useLogStore } from "@/entities/log";
import { useToastStore } from "@/shared/lib/toast.store";
import { useCallback } from "react";
import type { WebhookLog } from "@/entities/log";

export function useRealtimeLogs(endpointId: string | undefined) {
  const addLog = useLogStore((state) => state.addLog);
  const addToast = useToastStore((state) => state.addToast);

  const handleMessage = useCallback(
    (log: WebhookLog) => {
      addLog(log);
      addToast(`${log.method} 요청을 받았어요`, 3000);
    },
    [addLog, addToast],
  );

  const { status } = useSSE(endpointId, handleMessage);

  return { status };
}
