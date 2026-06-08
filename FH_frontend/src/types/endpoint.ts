export interface Endpoint {
  endpointId: string;
  label?: string;
  webhookUrl: string;
  dashboardUrl: string;
  expiresAt: string;
  limits: {
    maxLogs: number;
    maxSizeMb: number;
  };
}

export interface EndpointCreateResponse extends Endpoint {
  accessToken: string;
}
