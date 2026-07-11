/**
 * S2 — SSE 팬아웃 임계 테스트
 *
 * Grace Period 주의:
 *   - webhook_send 종료 T=125s, sse_subs 유지 T=160s → 35초 grace period 코드상 보장
 *   - 단, 큐(100)이 지속 포화 상태였다면 35초로 백로그 소화 안 될 수 있음
 *   - 본 실행 전 dry-run(축소 버전 1분) 선행 후:
 *     1) executor_queued 값이 T=125s 시점에 0 근접인지 확인
 *     2) executor.rejected.tasks 카운터가 0이면 grace 구간 충분, >0이면 기간 연장 검토
 */
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import sse from 'k6/x/sse';
import { cleanup, createEndpointWithCookie, sendWebhook, BASE_URL } from './helpers.js';

export const sseConnected = new Counter('sse_connected');
export const sseEventsReceived = new Counter('sse_events_received');
export const sseDelay = new Trend('sse_delay_ms', true);

export const options = {
  scenarios: {
    sse_subs: {
      executor: 'constant-vus',
      exec: 'sseSub',
      vus: 500,
      duration: '2m40s', // 30s+1m+30s webhook duration + 30s grace
    },
    webhook_send: {
      executor: 'ramping-arrival-rate',
      exec: 'webhookSend',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 400 },
        { duration: '30s', target: 0 },
      ],
      startTime: '5s', // Give SSE subs 5 seconds to connect
    },
  },
};

export function setup() {
  cleanup();
  const endpoints = [];
  console.log('S2 Setup: Creating 100 endpoints for fanout testing...');
  for (let i = 0; i < 100; i++) {
    const { endpointId, cookieHeader } = createEndpointWithCookie(`fanout-${i}`);
    if (endpointId) {
      endpoints.push({ endpointId, cookieHeader });
    }
  }
  console.log(`Created ${endpoints.length} endpoints`);
  return { endpoints };
}

export function sseSub(data) {
  const { endpoints } = data;
  // 500 VUs / 100 endpoints = 5 VUs per endpoint
  const epIndex = (__VU - 1) % endpoints.length;
  const ep = endpoints[epIndex];
  
  const url = `${BASE_URL}/api/endpoints/${ep.endpointId}/stream`;
  const params = { headers: { 'Cookie': ep.cookieHeader } };
  
  const res = sse.open(url, params, function (client) {
    client.on('open', function () {
      sseConnected.add(1);
    });
    
    client.on('event', function (msg) {
      try {
        const payload = JSON.parse(msg.data);
        if (payload.sentAt) {
          const delay = Date.now() - payload.sentAt;
          sseDelay.add(delay);
        }
        sseEventsReceived.add(1);
      } catch (e) {
        // ignore
      }
    });
    
    client.on('error', function (e) {
      console.log('SSE Error: ' + e.error());
    });
  });
  
  check(res, { 'SSE connected': (r) => r.status === 200 });
}

export function webhookSend(data) {
  const { endpoints } = data;
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const payload = { 
    sentAt: Date.now(), 
    pad: 'x'.repeat(100) 
  };
  
  sendWebhook(ep.endpointId, payload);
}

export function teardown() {
  cleanup();
}
