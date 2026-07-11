/**
 * S7 — 레이트리밋 동작 검증 (디폴트 한도)
 * 목적: 429 발생 비율/정확도 검증 (08 §Phase 1d)
 *
 * 전제: application-load.yaml 비활성 (디폴트 RL 한도 사용)
 * 실행: k6 run s7_ratelimit.js
 *
 * 코드 검증(PR_report.md §E) 확인된 한도:
 *  - webhook-receive: 100/분/EP/IP (rl:hook:{epId}:{clientIp})
 *  - endpoint-create: 5/10분/IP (rl:create2:{clientIp})
 *  - replay: 20/분/EP (rl:replay:{epId})
 *  - public-log: 60/분/IP (rl:public_log:{clientIp})
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { cleanup, createEndpoint, sendWebhook, BASE_URL, ADMIN_KEY, http429Count } from './helpers.js';

const rlHitCount = new Counter('rl_hit_count');
const rlMissCount = new Counter('rl_miss_count');  // 기대한 429가 안 온 경우

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    // 레이트리밋이 발동했는지만 확인하므로 오류율 임계값 없음
  },
};

export function setup() {
  cleanup();
  return {};
}

export default function () {
  // --- 시나리오 1: webhook-receive 한도 초과 ---
  console.log('=== S7-1: webhook-receive RL 검증 ===');
  const ep1 = createEndpoint('rl-test-webhook');
  if (!ep1) {
    console.error('엔드포인트 생성 실패');
    return;
  }

  // 동일 IP, 동일 EP에서 110회 전송 (한도: 100/분)
  let accepted = 0;
  let rejected = 0;
  for (let i = 0; i < 110; i++) {
    const res = sendWebhook(ep1, { idx: i, test: 'rl' });
    if (res.status === 429) {
      rejected++;
      rlHitCount.add(1);
    } else if (res.status >= 200 && res.status < 300) {
      accepted++;
    }
  }
  console.log(`webhook-receive: accepted=${accepted}, rejected=${rejected}`);
  const webhookRlOk = check({ accepted, rejected }, {
    'webhook RL: 100개 이하 통과': (d) => d.accepted <= 100,
    'webhook RL: 10개 이상 거부': (d) => d.rejected >= 10,
  });
  if (!webhookRlOk) rlMissCount.add(1);

  sleep(2);

  // --- 시나리오 2: endpoint-create 한도 초과 ---
  console.log('=== S7-2: endpoint-create RL 검증 ===');
  // 동일 IP로 6회 생성 시도 (한도: 5/10분)
  // 주의: 이미 1개 생성했으므로 총 5회 추가 시도
  let createAccepted = 0;
  let createRejected = 0;
  for (let i = 0; i < 5; i++) {
    const res = http.post(
      `${BASE_URL}/api/endpoints`,
      JSON.stringify({ label: `rl-test-create-${i}` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 429) {
      createRejected++;
      rlHitCount.add(1);
    } else if (res.status >= 200 && res.status < 300) {
      createAccepted++;
    }
  }
  console.log(`endpoint-create: accepted=${createAccepted}, rejected=${createRejected}`);
  // 이미 위에서 1회 생성했으니 추가 5회 중 적어도 1회는 거부돼야 함
  const createRlOk = check({ createAccepted, createRejected }, {
    'endpoint-create RL: 일부 거부됨': (d) => d.createRejected >= 1,
  });
  if (!createRlOk) rlMissCount.add(1);

  // --- 결과 요약 ---
  console.log(`\n=== S7 결과 요약 ===`);
  console.log(`총 RL 발동: ${rlHitCount.name}`);
}

export function teardown() {
  cleanup();
}
