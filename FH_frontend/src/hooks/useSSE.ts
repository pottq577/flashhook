import { useState, useEffect, useRef } from 'react';
import type { WebhookLog } from '../types/log';
import * as tokenStorage from '../utils/tokenStorage';

type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEReturn {
  status: SSEStatus;
}

export function useSSE(
  endpointId: string,
  onMessage: (log: WebhookLog) => void,
): UseSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('connecting');
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    // TODO: SSE 연결 구현
    const token = tokenStorage.get(endpointId);
    const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
    const url = `${baseUrl}/endpoints/${endpointId}/stream${token ? `?token=${token}` : ''}`;

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus('connected');
    };

    // 'webhook' 이벤트를 명시적으로 리스닝
    eventSource.addEventListener('webhook', (event: MessageEvent) => {
      try {
        const log = JSON.parse(event.data) as WebhookLog;
        onMessageRef.current(log);
      } catch (error) {
        console.error('Failed to parse webhook event:', error);
      }
    });

    eventSource.addEventListener('connect', () => {
      // 503 방지 더미 이벤트 무시
    });

    eventSource.addEventListener('ping', () => {
      // heartbeat 무시
    });

    eventSource.onerror = () => {
      setStatus('disconnected');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [endpointId]);

  return { status };
}
