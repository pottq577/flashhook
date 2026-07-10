import http from 'k6/http';
import { check, sleep } from 'k6';
import { cleanup, createEndpointWithCookie, sendWebhook, getLogs, BASE_URL } from './helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],  // 5% 이하 허용 (429 포함)
    http_req_duration: ['p(95)<2000'],
  },
};

let endpointData;

export function setup() {
  cleanup();
  endpointData = createEndpointWithCookie('smoke-test');
  if (!endpointData.endpointId) throw new Error('setup: endpoint 생성 실패');
  console.log(`Smoke test endpointId: ${endpointData.endpointId}`);
  return { endpointId: endpointData.endpointId };
}

export default function (data) {
  const { endpointId } = data;

  // 1. 웹훅 수신
  const wRes = sendWebhook(endpointId, {
    test: 'smoke',
    ts: Date.now(),
  });
  check(wRes, {
    'webhook 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 2. 엔드포인트 정보 조회 (인증 불필요)
  const eRes = http.get(`${BASE_URL}/api/endpoints/${endpointId}`);
  check(eRes, {
    'endpoint info 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 3. 헬스체크 (actuator port = 9090, localhost binding)
  const hRes = http.get('http://127.0.0.1:9090/actuator/health');
  check(hRes, {
    'health UP': (r) => r.status === 200,
  });

  sleep(1);
}

export function teardown(data) {
  cleanup();
}

