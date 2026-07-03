import { useSSE, useLogStore, createLogDetailFromLog } from "@/entities/log";
import { useToastStore } from "@/shared/lib/toast.store";
import { useCallback } from "react";
import type { WebhookLog } from "@/entities/log";

export function useRealtimeLogs(endpointId: string | undefined) {
  const addLog = useLogStore((state) => state.addLog);
  const addToast = useToastStore((state) => state.addToast);

  const handleMessage = useCallback(
    (log: WebhookLog) => {
      addLog(log);
      addToast(`${log.method} 요청을 받았어요`);

      // 선택된 로그가 없으면 새 로그를 자동 선택
      const { selectedLog, setSelectedLog } = useLogStore.getState();
      if (selectedLog === null) {
        setSelectedLog(createLogDetailFromLog(log));
      }
    },
    [addLog, addToast],
  );

  const { status } = useSSE(endpointId, handleMessage);

  return { status };
}
