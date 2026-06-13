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

  let attempt = 0;
  const maxRetries = (options.method && options.method !== 'GET') ? 0 : 2;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          attempt++;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
          continue;
        }
        
        const errorBody = await response.text();
        if (import.meta.env.MODE === 'development') {
          logger.error(`API Error ${response.status}:`, errorBody.slice(0, 500));
        } else {
          logger.error(`API Error ${response.status}`);
        }

        if (response.status >= 500) {
          throw new Error(`서버에 문제가 생겼어요 (${response.status}). 잠시 후 다시 시도해주세요.`);
        } else if (response.status === 401) {
          throw new Error('인증이 필요해요. 다시 로그인해주세요.');
        } else if (response.status === 403) {
          throw new Error('이 페이지를 볼 수 있는 권한이 없어요.');
        } else if (response.status === 404) {
          throw new Error('요청한 리소스를 찾을 수 없어요.');
        }
        throw new Error(`정보를 불러오지 못했어요 (${response.status}).`);
      }

      if (response.status === 204) {
        return undefined;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        if (attempt < maxRetries) {
          attempt++;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        throw new Error('요청 시간이 초과되었어요. 네트워크 상태를 확인해주세요.', { cause: error });
      }
      throw error;
    }
  }
}
