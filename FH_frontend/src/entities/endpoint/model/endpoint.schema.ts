import { z } from 'zod';

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
});

export const EndpointCreateResponseSchema = EndpointSchema.extend({
  accessToken: z.string(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;
export type EndpointCreateResponse = z.infer<typeof EndpointCreateResponseSchema>;
