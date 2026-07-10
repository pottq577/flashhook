import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { cleanup, BASE_URL } from './helpers.js';

export const http429Count = new Counter('http_429_count');
export const endpointCreatedCount = new Counter('endpoint_created_count');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [
        { duration: '30s', target: 100 }, // Ramp-up to 100 EPS
        { duration: '1m', target: 200 },  // Spike to 200 EPS
        { duration: '30s', target: 0 },   // Ramp-down
      ],
    },
  },
};

export function setup() {
  cleanup();
  return {};
}

export default function () {
  const label = `spike-${__VU}-${__ITER}`;
  const res = http.post(`${BASE_URL}/api/endpoints`, JSON.stringify({ label }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 429) {
    http429Count.add(1);
  } else if (res.status === 201 || res.status === 200) {
    endpointCreatedCount.add(1);
  }

  check(res, {
    'created or 429': (r) => r.status === 201 || r.status === 200 || r.status === 429,
  });
}

export function teardown() {
  cleanup();
}
