import { z } from 'zod';

export const MockConfigSchema = z.object({
  statusCode: z.number().min(100).max(599).default(200),
  delayMs: z.number().min(0).max(10000).default(0),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().default('ok'),
});

export const EndpointSchema = z.object({
  endpointId: z.string(),
  label: z.string().nullish(),
  webhookUrl: z.string().url(),
  dashboardUrl: z.string().url(),
  expiresAt: z.string(),
  limits: z.object({
    maxLogs: z.number(),
    maxSizeMb: z.number(),
  }).optional(),
  mockConfig: MockConfigSchema.optional(),
});

export const EndpointCreateResponseSchema = EndpointSchema.extend({
  accessToken: z.string(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;
export type EndpointCreateResponse = z.infer<typeof EndpointCreateResponseSchema>;
