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

    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data as string) as WebhookLog;
      onMessageRef.current(log);
    };

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
