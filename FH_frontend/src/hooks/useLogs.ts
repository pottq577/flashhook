import { useState, useCallback } from 'react';
import type { WebhookLog } from '../types/log';
import type { WebhookLogDetail } from '../types/log';
import { getLogDetail } from '../api/logs';

interface UseLogsReturn {
  logs: WebhookLog[];
  selectedLog: WebhookLogDetail | null;
  addLog: (log: WebhookLog) => void;
  selectLog: (endpointId: string, logId: string) => void;
}

export function useLogs(endpointId: string): UseLogsReturn {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WebhookLogDetail | null>(null);

  const addLog = useCallback((log: WebhookLog) => {
    setLogs((prev) => [log, ...prev]);
  }, []);

  const selectLog = useCallback(
    (eid: string, logId: string) => {
      // TODO: 로그 상세 조회
      getLogDetail(eid, logId)
        .then(setSelectedLog)
        .catch(console.error);
    },
    [],
  );

  // endpointId를 향후 초기 로드에 사용
  void endpointId;

  return { logs, selectedLog, addLog, selectLog };
}
