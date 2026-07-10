import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import sse from 'k6/x/sse';
import { cleanup, createEndpointWithCookie, BASE_URL } from './helpers.js';

export const sseConnected = new Counter('sse_connected');
export const sseDropped = new Counter('sse_dropped');

export const options = {
  scenarios: {
    scale: {
      executor: 'constant-vus',
      vus: 500,
      duration: '1m', // Reduced from 30m for quick verification
    },
  },
};

export function setup() {
  cleanup();
  const endpoints = [];
  console.log('S3 Setup: Creating 500 endpoints for scale testing...');
  for (let i = 0; i < 500; i++) {
    const { endpointId, cookieHeader } = createEndpointWithCookie(`scale-${i}`);
    if (endpointId) {
      endpoints.push({ endpointId, cookieHeader });
    }
  }
  return { endpoints };
}

export default function (data) {
  const { endpoints } = data;
  const ep = endpoints[__VU - 1]; // Each VU gets one endpoint
  if (!ep) return;
  
  const url = `${BASE_URL}/api/endpoints/${ep.endpointId}/stream`;
  const params = { headers: { 'Cookie': ep.cookieHeader } };
  
  const res = sse.open(url, params, function (client) {
    client.on('open', function () {
      sseConnected.add(1);
    });
    
    client.on('error', function (e) {
      sseDropped.add(1);
      console.log('SSE Error: ' + e.error());
    });
  });
  
  check(res, { 'SSE connected': (r) => r.status === 200 });
}

export function teardown() {
  cleanup();
}
