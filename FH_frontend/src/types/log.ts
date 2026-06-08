export interface WebhookLog {
  logId: string;
  method: string;
  contentType: string;
  clientIp: string;
  bodyPreview: string;
  bodySize: number;
  receivedAt: string;
}

export interface WebhookLogDetail extends WebhookLog {
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
}
