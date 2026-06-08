import { apiRequest } from '../../../shared/api/client';
import { LogsResponseSchema, WebhookLogDetailSchema, type LogsResponse, type WebhookLogDetail } from '../model/log.schema';

export async function getLogs(
  endpointId: string,
  page: number,
  size: number,
): Promise<LogsResponse> {
  const data = await apiRequest(
    `/endpoints/${endpointId}/logs?page=${page}&size=${size}`,
    {},
    endpointId,
  );
  return LogsResponseSchema.parse(data);
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
