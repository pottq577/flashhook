import { resolveApiBaseUrl } from '@/shared/config/api';
const API_BASE_URL = resolveApiBaseUrl();
import { useAdminStore } from '@/entities/admin/model/adminStore';

export interface AdminMetrics {
  endpointsCreatedToday: number;
  totalWebhooksReceived: number;
  activeSseConnections: number;
}

export interface SuspiciousEndpoint {
  endpointId: string;
  label: string;
  logCount: number;
  creatorIp: string;
}

export interface BlacklistRequest {
  ip: string;
}

const getHeaders = () => {
  const token = useAdminStore.getState().adminToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Admin-Token': token } : {}),
  };
};

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (res.status === 401 || res.status === 403) {
    useAdminStore.getState().logout();
    throw new Error('Authentication failed');
  }
  if (!res.ok) {
    throw new Error('API Request failed');
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};

export const adminApi = {
  getMetrics: async (): Promise<AdminMetrics> => {
    const res = await fetch(`${API_BASE_URL}/admin/metrics`, { headers: getHeaders() });
    return handleResponse<AdminMetrics>(res);
  },
  
  getSuspiciousEndpoints: async (): Promise<SuspiciousEndpoint[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/endpoints/suspicious`, { headers: getHeaders() });
    return handleResponse<AdminMetrics>(res);
  },

  deleteEndpoint: async (endpointId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/admin/endpoints/${encodeURIComponent(endpointId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<AdminMetrics>(res);
  },

  getBlacklistedIps: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/blacklist`, { headers: getHeaders() });
    return handleResponse<AdminMetrics>(res);
  },

  blacklistIp: async (ip: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/admin/blacklist`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ip }),
    });
    return handleResponse<AdminMetrics>(res);
  },

  removeBlacklistedIp: async (ip: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/admin/blacklist/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse<void>(res);
  }
};
