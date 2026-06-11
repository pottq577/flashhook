import * as tokenStorage from '@/shared/lib/tokenStorage';
import { logger } from '@/shared/lib/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function apiRequest(
  path: string,
  options: RequestOptions = {},
  endpointId?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (endpointId) {
    const token = tokenStorage.get(endpointId);
    if (token) {
      headers['X-Access-Token'] = token;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`API Error ${response.status}:`, errorBody);

    if (response.status >= 500) {
      throw new Error(`서버에서 문제가 발생했습니다 (${response.status}). 잠시 후 다시 시도해주세요.`);
    } else {
      throw new Error(`API 요청에 실패했습니다 (${response.status}).`);
    }
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}
