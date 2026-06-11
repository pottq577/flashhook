import { z } from 'zod';

export const WebhookLogSchema = z.object({
  logId: z.string(),
  method: z.string(),
  contentType: z.string().nullish(),
  clientIp: z.string(),
  bodyPreview: z.string(),
  bodySize: z.number(),
  receivedAt: z.string(),
});

export const WebhookLogDetailSchema = WebhookLogSchema.extend({
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  queryParams: z.record(z.string(), z.string()),
  body: z.unknown(),
});

export const LogsResponseSchema = z.object({
  content: z.array(WebhookLogSchema),
  page: z.object({
    totalElements: z.number(),
    totalPages: z.number(),
  }).optional(),
  totalElements: z.number().optional(),
  totalPages: z.number().optional(),
}).transform((data) => ({
  content: data.content,
  totalElements: data.page?.totalElements ?? data.totalElements ?? 0,
  totalPages: data.page?.totalPages ?? data.totalPages ?? 0,
}));

export type WebhookLog = z.infer<typeof WebhookLogSchema>;
export type WebhookLogDetail = z.infer<typeof WebhookLogDetailSchema>;
export type LogsResponse = z.infer<typeof LogsResponseSchema>;
