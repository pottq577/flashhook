import { useQuery, useMutation } from '@tanstack/react-query';
import { getLogs, getLogDetail } from './log.api';
import { useLogStore } from '@/entities/log/model/log.store';
import { logger } from '@/shared/lib/logger';

export const useLogsQuery = (endpointId: string, page = 0, size = 50, lastSeenId?: string) => {
  const setLogs = useLogStore((state) => state.setLogs);
  
  return useQuery({
    queryKey: ['logs', endpointId, page, size, lastSeenId],
    queryFn: async () => {
      const data = await getLogs(endpointId, page, size, lastSeenId);
      // Initialize store with fetched logs
      setLogs(data.content);
      return data;
    },
    enabled: !!endpointId,
  });
};

export const useLogDetailQuery = (endpointId: string, logId: string | undefined) => {
  const setSelectedLog = useLogStore((state) => state.setSelectedLog);

  return useQuery({
    queryKey: ['logDetail', endpointId, logId],
    queryFn: async () => {
      if (!logId) return null;
      try {
        const detail = await getLogDetail(endpointId, logId);
        setSelectedLog(detail);
        return detail;
      } catch (error) {
        logger.error('Failed to fetch log detail', error);
        throw error;
      }
    },
    enabled: !!endpointId && !!logId,
  });
};

export const useDeleteAllLogsMutation = (endpointId: string) => {
  const clearLogs = useLogStore((state) => state.clearLogs);
  
  return useMutation({
    mutationFn: () => import('./log.api').then(m => m.deleteAllLogs(endpointId)),
    onSuccess: () => {
      // Zustand 로컬 상태 파기
      clearLogs();
      // React Query 서버 상태 무효화 (강제 재동기화)
      import('@/app/providers/QueryProvider').then(m => {
        m.queryClient.invalidateQueries({ queryKey: ['logs', endpointId] });
      });
    },
    onError: (error) => {
      logger.error('Failed to delete all logs', error);
    }
  });
};
