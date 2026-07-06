import { apiRequest } from '@/shared/api/client';
import { LogsResponseSchema, WebhookLogDetailSchema, PublicWebhookLogSchema, type LogsResponse, type WebhookLogDetail, type PublicWebhookLog } from "@/entities/log/model/log.schema";

export async function getLogs(
  endpointId: string,
  page: number,
  size: number,
  lastSeenId?: string
): Promise<LogsResponse> {
  let url = `/endpoints/${endpointId}/logs?page=${page}&size=${size}`;
  if (lastSeenId) {
    url += `&lastSeenId=${lastSeenId}`;
  }
  const data = await apiRequest(
    url,
    {},
    endpointId,
  );
  return LogsResponseSchema.parse(data);
}

export async function getPublicLog(logId: string): Promise<PublicWebhookLog> {
  const data = await apiRequest(`/public/logs/${logId}`);
  return PublicWebhookLogSchema.parse(data);
}

export async function getLogDetail(
  endpointId: string,
  logId: string,
): Promise<WebhookLogDetail> {
  const data = await apiRequest(
    `/endpoints/${endpointId}/logs/${logId}`,
    {},
    endpointId,
  );
  return WebhookLogDetailSchema.parse(data);
}

export async function deleteAllLogs(endpointId: string): Promise<void> {
  await apiRequest(
    `/endpoints/${endpointId}/logs`,
    { method: 'DELETE' },
    endpointId,
  );
}

export async function replayLog(endpointId: string, logId: string, destinationUrl: string): Promise<void> {
  await apiRequest(
    `/endpoints/${endpointId}/logs/${logId}/replay`,
    {
      method: 'POST',
      body: { destinationUrl },
    },
    endpointId,
  );
}
