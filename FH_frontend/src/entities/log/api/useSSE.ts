import { useState, useEffect } from 'react';
import type { WebhookLog } from '@/entities/log/model/log.schema';
import * as tokenStorage from '@/shared/lib/tokenStorage';
import { logger } from '@/shared/lib/logger';

type SSEStatus = 'connecting' | 'connected' | 'disconnected';

export function useSSE(
  endpointId: string | undefined,
  onMessage: (log: WebhookLog) => void,
) {
  const [status, setStatus] = useState<SSEStatus>('connecting');

  useEffect(() => {
    if (!endpointId) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    async function connectSSE() {
      try {
        const token = tokenStorage.get(endpointId!);
        const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
        
        // Fetch stream-token
        const res = await fetch(`${baseUrl}/endpoints/${endpointId}/stream-token`, {
          method: 'POST',
          headers: token ? { 'X-Access-Token': token } : {}
        });
        
        if (!res.ok) throw new Error('Failed to get stream token');
        const data = await res.json();
        const streamToken = data.streamToken;
        
        if (!isMounted) return;

        const url = `${baseUrl}/endpoints/${endpointId}/stream?streamToken=${streamToken}`;
        eventSource = new EventSource(url);

    eventSource.onopen = () => {
      if (!isMounted) return;
      setStatus('connected');
      logger.info('SSE Connected');
    };

    eventSource.addEventListener('webhook', (event: MessageEvent) => {
      try {
        const log = JSON.parse(event.data) as WebhookLog;
        onMessage(log);
      } catch (error) {
        logger.error('Failed to parse webhook event', error);
      }
    });

    eventSource.addEventListener('connect', () => {});
    eventSource.addEventListener('ping', () => {});

    eventSource.onerror = () => {
      if (!isMounted) return;
      setStatus('disconnected');
        eventSource?.close();
        logger.warn('SSE Disconnected');
      };
      } catch (err) {
        if (!isMounted) return;
        setStatus('disconnected');
        logger.error('SSE connect error', err);
      }
    }
    
    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [endpointId, onMessage]);

  return { status };
}
