import { apiRequest } from './client';
import type { Endpoint, EndpointCreateResponse } from '../types/endpoint';

export function createEndpoint(label?: string): Promise<EndpointCreateResponse> {
  return apiRequest<EndpointCreateResponse>('/endpoints', {
    method: 'POST',
    body: label ? { label } : undefined,
  });
}

export function getEndpoint(id: string): Promise<Endpoint> {
  return apiRequest<Endpoint>(`/endpoints/${id}`, {}, id);
}

export function deleteEndpoint(id: string): Promise<void> {
  return apiRequest<void>(`/endpoints/${id}`, { method: 'DELETE' }, id);
}
