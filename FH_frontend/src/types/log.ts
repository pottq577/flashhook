export interface WebhookLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  contentType: string;
  timestamp: string;
  size: number;
}

export interface WebhookLogDetail {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  contentType: string;
  timestamp: string;
  size: number;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  sourceIp: string;
}
