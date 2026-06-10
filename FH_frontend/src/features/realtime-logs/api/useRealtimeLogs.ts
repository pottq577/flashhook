import { useSSE } from '@/entities/log/api/useSSE';
import { useLogStore } from '@/entities/log/model/log.store';

export function useRealtimeLogs(endpointId: string | undefined) {
  const addLog = useLogStore((state) => state.addLog);
  const { status } = useSSE(endpointId, addLog);

  return { status };
}
