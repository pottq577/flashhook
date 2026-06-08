import { apiRequest } from './client';
import type { WebhookLog, WebhookLogDetail } from '../types/log';

interface LogsResponse {
  content: WebhookLog[];
  totalElements: number;
  totalPages: number;
}

export function getLogs(
  endpointId: string,
  page: number,
  size: number,
): Promise<LogsResponse> {
  return apiRequest<LogsResponse>(
    `/endpoints/${endpointId}/logs?page=${page}&size=${size}`,
    {},
    endpointId,
  );
}

export function getLogDetail(
  endpointId: string,
  logId: string,
): Promise<WebhookLogDetail> {
  return apiRequest<WebhookLogDetail>(
    `/endpoints/${endpointId}/logs/${logId}`,
    {},
    endpointId,
  );
}

export function deleteAllLogs(endpointId: string): Promise<void> {
  return apiRequest<void>(
    `/endpoints/${endpointId}/logs`,
    { method: 'DELETE' },
    endpointId,
  );
}
