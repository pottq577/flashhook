/**
 * S1 — 웹훅 수신 용량 테스트 (ramping-arrival-rate)
 * 목적: SSE 팬아웃 임계 TPS 확인 (문서 예측: ~400 TPS)
 *
 * 전제: application-load.yaml 프로파일 활성화 필요 (RL/로그 상한 완화)
 * 실행: k6 run s1_webhook_capacity.js --env BASE_URL=http://localhost:8080
 *
 * 판단 기준 (08 §0):
 *  - http_req_duration p95 < 300ms
 *  - http_req_duration p99 < 800ms
 *  - 오류율(429 제외) < 0.5%
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { cleanup, createEndpoint, sendWebhook, randomIp, BASE_URL, http429Count } from './helpers.js';

// 커스텀 메트릭
const webhookErrorRate = new Rate('webhook_error_rate');
const webhookDuration = new Trend('webhook_duration_ms', true);

// 사전 생성 엔드포인트 풀 크기 (분산 유입 시뮬레이션)
const EP_COUNT = 50;

export const options = {
  scenarios: {
    webhook_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 10,       // 시작: 10 req/s
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 50 },   // 0→50 TPS 워밍업
        { duration: '2m', target: 200 },  // 50→200 TPS
        { duration: '2m', target: 400 },  // 200→400 TPS (예측 임계)
        { duration: '2m', target: 600 },  // 400→600 TPS (포화 확인)
        { duration: '1m', target: 100 },  // 쿨다운
      ],
    },
  },
  thresholds: {
    // 판단 기준 (08 §0 — 429 제외 후 평가)
    'http_req_duration{scenario:webhook_ramp}': ['p(95)<300', 'p(99)<800'],
    'webhook_error_rate': ['rate<0.005'],
  },
};

let endpointIds = [];

export function setup() {
  cleanup();
  console.log(`엔드포인트 ${EP_COUNT}개 생성 중...`);
  for (let i = 0; i < EP_COUNT; i++) {
    const ip = randomIp();
    // CF-Connecting-IP 로 IP 분산 (엔드포인트 생성 RL 우회, 로컬 전용)
    const res = http.post(
      `${BASE_URL}/api/endpoints`,
      JSON.stringify({ label: `loadtest-s1-${i}` }),
      { headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip } }
    );
    if (res.status === 200 || res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        endpointIds.push(body.endpointId);
      } catch (e) {
        console.warn(`EP ${i} 파싱 실패: ${res.body}`);
      }
    }
  }
  if (endpointIds.length === 0) throw new Error('setup: 엔드포인트 생성 전혀 안 됨');
  console.log(`생성된 엔드포인트: ${endpointIds.length}개`);
  return { endpointIds };
}

export default function (data) {
  const { endpointIds } = data;
  const epId = endpointIds[Math.floor(Math.random() * endpointIds.length)];
  const clientIp = randomIp();

  const startTs = Date.now();
  const res = sendWebhook(
    epId,
    { sentAt: startTs, load: 's1', idx: __ITER },
    clientIp
  );

  webhookDuration.add(Date.now() - startTs);

  if (res.status === 429) {
    http429Count.add(1);
    // 429는 오류율에서 제외 (정상 동작)
    return;
  }

  const ok = check(res, {
    'webhook 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  webhookErrorRate.add(!ok);
}

export function teardown(data) {
  cleanup();
}
