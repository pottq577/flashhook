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
  /** Phase 2: 동적 프리셋 식별자. 정적 프리셋 적용 시 항상 null 전송 (동적 핸들러 해제 보장). */
  presetType?: string | null;
};

export async function updateMockConfig(id: string, mockConfig: MockUpdateRequest): Promise<Endpoint> {
  const data = await apiRequest(`/endpoints/${id}/mock`, {
    method: 'PATCH',
    body: mockConfig,
  }, id);
  return EndpointSchema.parse(data);
}
