export interface Endpoint {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  logCount: number;
}

export interface EndpointCreateResponse {
  id: string;
  url: string;
  token: string;
  expiresAt: string;
}
