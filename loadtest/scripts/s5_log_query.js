import http from 'k6/http';
import { check } from 'k6';
import { cleanup, createEndpointWithCookie, sendWebhook, getLogs, BASE_URL } from './helpers.js';
import { Counter } from 'k6/metrics';

export const logQuerySuccess = new Counter('log_query_success');

export const options = {
  scenarios: {
    query: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 queries per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
};

export function setup() {
  cleanup();
  const { endpointId, cookieHeader } = createEndpointWithCookie('log-query-test');
  if (!endpointId) throw new Error('Endpoint creation failed');

  console.log(`S5 Setup: Created endpoint ${endpointId}, sending 500 webhooks...`);
  // Send 500 webhooks to populate DB
  for (let i = 0; i < 500; i++) {
    sendWebhook(endpointId, { idx: i, payload: 'x'.repeat(100) });
  }

  return { endpointId, cookieHeader };
}

export default function (data) {
  const { endpointId, cookieHeader } = data;
  
  // Random page 0~10
  const page = Math.floor(Math.random() * 10);
  
  const headers = { 'Cookie': cookieHeader };
  const res = http.get(`${BASE_URL}/api/endpoints/${endpointId}/logs?page=${page}&size=20`, { headers });
  
  if (res.status === 200) {
    logQuerySuccess.add(1);
  }
  
  check(res, {
    'log query 200': (r) => r.status === 200,
  });
}

export function teardown() {
  cleanup();
}
