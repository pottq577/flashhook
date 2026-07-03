import { useQuery, useMutation } from '@tanstack/react-query';
import { getLogs, getLogDetail, getPublicLog, deleteAllLogs, replayLog } from './log.api';
import { useLogStore } from "../model/log.store";
import { logger } from '@/shared/lib/logger';
import { queryClient } from '@/shared/lib/queryClient';

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
        logger.error('Failed to fetch log detail', { endpointId, logId, error });
        throw error;
      }
    },
    enabled: !!endpointId && !!logId,
  });
};

export const usePublicLogQuery = (logId: string | undefined) => {
  return useQuery({
    queryKey: ['publicLog', logId],
    queryFn: async () => {
      if (!logId) return null;
      try {
        const data = await getPublicLog(logId);
        return data;
      } catch (error) {
        logger.error('Failed to fetch public log', { logId, error });
        throw error;
      }
    },
    enabled: !!logId,
  });
};

export const useDeleteAllLogsMutation = (endpointId: string) => {
  const clearLogs = useLogStore((state) => state.clearLogs);
  
  return useMutation({
    mutationFn: () => deleteAllLogs(endpointId),
    onSuccess: async () => {
      // React Query 서버 상태 무효화 (강제 재동기화)
      await queryClient.invalidateQueries({ queryKey: ['logs', endpointId] });
      // Zustand 로컬 상태 파기 (UI 깜박임 방지를 위해 캐시 갱신 후 실행)
      clearLogs();
    },
    onError: (error) => {
      logger.error('Failed to delete all logs', { endpointId, error });
    }
  });
};

export const useReplayLogMutation = () => {
  return useMutation({
    mutationFn: ({ endpointId, logId, destinationUrl }: { endpointId: string; logId: string; destinationUrl: string }) => 
      replayLog(endpointId, logId, destinationUrl),
    meta: { suppressErrorToast: true },
    onError: (error, variables) => {
      logger.error('Failed to replay log', { 
        endpointId: variables.endpointId, 
        logId: variables.logId, 
        destinationUrl: variables.destinationUrl, 
        error 
      });
    }
  });
};
