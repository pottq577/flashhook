import { useSSE } from '@/entities/log/api/useSSE';
import { useLogStore } from '@/entities/log/model/log.store';
import { useToastStore } from '@/shared/lib/toast.store';
import { useCallback } from 'react';
import type { WebhookLog } from '@/entities/log/model/log.schema';

export function useRealtimeLogs(endpointId: string | undefined) {
  const addLog = useLogStore((state) => state.addLog);
  const addToast = useToastStore((state) => state.addToast);

  const handleMessage = useCallback((log: WebhookLog) => {
    addLog(log);
    addToast(`${log.method} 수신 완료`, 3000);
  }, [addLog, addToast]);

  const { status } = useSSE(endpointId, handleMessage);

  return { status };
}
