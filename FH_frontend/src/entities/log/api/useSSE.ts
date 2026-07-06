import { useState, useEffect } from "react";
import { WebhookLogSchema, type WebhookLog } from "@/entities/log/model/log.schema";

import { logger } from "@/shared/lib/logger";
import { resolveApiBaseUrl } from "@/shared/config/api";

type SSEStatus = "connecting" | "connected" | "disconnected";

export function useSSE(
  endpointId: string | undefined,
  onMessage: (log: WebhookLog) => void,
) {
  const [status, setStatus] = useState<SSEStatus>("connecting");

  useEffect(() => {
    if (!endpointId) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    async function connectSSE() {
      try {
        const baseUrl = resolveApiBaseUrl();
        if (!isMounted) return;

        const url = `${baseUrl}/endpoints/${endpointId}/stream`;
        eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onopen = () => {
          if (!isMounted) return;
          setStatus("connected");
          logger.info("SSE Connected");
        };

        eventSource.addEventListener("webhook", (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            const log = WebhookLogSchema.parse(parsed);
            onMessage(log);
          } catch (error) {
            logger.error("Failed to parse webhook event", error);
          }
        });

        eventSource.addEventListener("connect", () => {});
        eventSource.addEventListener("ping", () => {});

        eventSource.onerror = () => {
          if (!isMounted) return;
          setStatus("disconnected");
          logger.warn("SSE Disconnected (will attempt reconnect)");
        };
      } catch (err) {
        if (!isMounted) return;
        setStatus("disconnected");
        logger.error("SSE connect error", err);
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
