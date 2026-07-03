import { z } from "zod";

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

export const LogsResponseSchema = z
  .object({
    content: z.array(WebhookLogSchema),
    page: z
      .object({
        totalElements: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .optional(),
    totalElements: z.number().int().nonnegative().optional(),
    totalPages: z.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.page &&
      data.totalElements !== undefined &&
      data.page.totalElements !== data.totalElements
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "page.totalElements와 totalElements 값이 일치하지 않습니다",
        path: ["totalElements"],
      });
    }
    if (
      data.page &&
      data.totalPages !== undefined &&
      data.page.totalPages !== data.totalPages
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "page.totalPages와 totalPages 값이 일치하지 않습니다",
        path: ["totalPages"],
      });
    }
  })
  .transform((data) => ({
    content: data.content,
    totalElements: data.page?.totalElements ?? data.totalElements ?? 0,
    totalPages: data.page?.totalPages ?? data.totalPages ?? 0,
  }));

export const PublicWebhookLogSchema = z.object({
  logId: z.string(),
  method: z.string(),
  receivedAt: z.string(),
  safeHeaders: z.record(z.string(), z.string()),
  bodyStatus: z.string(),
});

export type WebhookLog = z.infer<typeof WebhookLogSchema>;
export type WebhookLogDetail = z.infer<typeof WebhookLogDetailSchema>;
export type PublicWebhookLog = z.infer<typeof PublicWebhookLogSchema>;
export type LogsResponse = z.infer<typeof LogsResponseSchema>;

export function createLogDetailFromLog(log?: WebhookLog, logId?: string): WebhookLogDetail {
  return {
    logId: logId ?? log?.logId ?? "",
    method: log?.method ?? "",
    contentType: log?.contentType ?? null,
    clientIp: log?.clientIp ?? "",
    bodyPreview: log?.bodyPreview ?? "",
    bodySize: log?.bodySize ?? 0,
    receivedAt: log?.receivedAt ?? "",
    url: "",
    headers: {},
    queryParams: {},
    body: null,
  };
}
