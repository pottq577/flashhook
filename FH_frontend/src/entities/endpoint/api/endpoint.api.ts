import { apiRequest } from '@/shared/api/client';
import { EndpointSchema, EndpointCreateResponseSchema, type Endpoint, type EndpointCreateResponse } from '@/entities/endpoint/model/endpoint.schema';

export async function createEndpoint(label?: string): Promise<EndpointCreateResponse> {
  const data = await apiRequest('/endpoints', {
    method: 'POST',
    body: label ? { label } : undefined,
  });
  return EndpointCreateResponseSchema.parse(data);
}

export async function getEndpoint(id: string): Promise<Endpoint> {
  const data = await apiRequest(`/endpoints/${id}`, {}, id);
  return EndpointSchema.parse(data);
}

export async function deleteEndpoint(id: string): Promise<void> {
  await apiRequest(`/endpoints/${id}`, { method: 'DELETE' }, id);
}

export type MockUpdateRequest = {
  statusCode?: number;
  delayMs?: number;
  headers?: Record<string, string>;
  body?: string;
};

export async function updateMockConfig(id: string, mockConfig: MockUpdateRequest): Promise<Endpoint> {
  const data = await apiRequest(`/endpoints/${id}/mock`, {
    method: 'PATCH',
    body: mockConfig,
  }, id);
  return EndpointSchema.parse(data);
}
