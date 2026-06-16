import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/shared/api/adminApi';
import { useAdminStore } from '@/entities/admin/model/adminStore';

const POLLING_INTERVAL = 30000;

export const adminKeys = {
  all: ['admin'] as const,
  metrics: (token: string | null) => [...adminKeys.all, 'metrics', token] as const,
  suspicious: (token: string | null) => [...adminKeys.all, 'suspicious', token] as const,
  blacklist: (token: string | null) => [...adminKeys.all, 'blacklist', token] as const,
  suspiciousAll: () => [...adminKeys.all, 'suspicious'] as const,
  blacklistAll: () => [...adminKeys.all, 'blacklist'] as const,
};

export const useAdminMetrics = () => {
  const token = useAdminStore((state) => state.adminToken);
  return useQuery({
    queryKey: adminKeys.metrics(token),
    queryFn: adminApi.getMetrics,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!token,
  });
};

export const useAdminSuspiciousEndpoints = () => {
  const token = useAdminStore((state) => state.adminToken);
  return useQuery({
    queryKey: adminKeys.suspicious(token),
    queryFn: adminApi.getSuspiciousEndpoints,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!token,
  });
};

export const useAdminBlacklist = () => {
  const token = useAdminStore((state) => state.adminToken);
  return useQuery({
    queryKey: adminKeys.blacklist(token),
    queryFn: adminApi.getBlacklistedIps,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!token,
  });
};

export const useDeleteEndpointMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.suspiciousAll() });
    },
  });
};

export const useAddBlacklistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.blacklistIp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.blacklistAll() });
    },
  });
};

export const useRemoveBlacklistMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.removeBlacklistedIp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.blacklistAll() });
    },
  });
};
