/**
 * S8 — 로그 상한 동작 검증 (500건/5MB)
 * 목적: 상한 도달 후 거부/정리 성능 관찰 (08 §Phase 1e)
 *
 * 코드 검증(PR_report.md §F):
 *  - FlashHookProperties.log.maxCount = 500 (application.yaml:57)
 *  - FlashHookProperties.log.maxSizeBytes = 5242880 = 5MB (application.yaml:58)
 *  - WebhookService.enforceLogCap(): while 루프로 오래된 로그 삭제
 *
 * 전제: 디폴트 설정 (application-load.yaml 비활성)
 * 실행: k6 run s8_log_cap.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { cleanup, createEndpointWithCookie, sendWebhook, getLogs, BASE_URL } from './helpers.js';

const preCapDuration = new Trend('pre_cap_duration_ms', true);
const postCapDuration = new Trend('post_cap_duration_ms', true);

export const options = {
  vus: 1,
  iterations: 1,
};

export function setup() {
  cleanup();
  return {};
}

export default function () {
  const { endpointId: epId, cookieHeader } = createEndpointWithCookie('log-cap-test');
  if (!epId) {
    console.error('엔드포인트 생성 실패');
    return;
  }
  console.log(`Log cap test epId: ${epId}`);

  // Phase 1: 상한 이전 (1~490번째) — 정상 write 성능
  console.log('Phase 1: 상한 이전 490건 전송...');
  for (let i = 0; i < 490; i++) {
    const t = Date.now();
    const res = sendWebhook(epId, { idx: i, phase: 'pre-cap', pad: 'x'.repeat(50) });
    preCapDuration.add(Date.now() - t);
    if (res.status !== 200 && res.status !== 201) {
      console.warn(`pre-cap ${i}: status=${res.status}`);
    }
  }

  // Phase 2: 상한 통과 (491~560번째) — enforceLogCap 발동 구간
  console.log('Phase 2: 상한 초과 70건 전송 (enforceLogCap 발동)...');
  for (let i = 490; i < 560; i++) {
    const t = Date.now();
    const res = sendWebhook(epId, { idx: i, phase: 'post-cap', pad: 'x'.repeat(50) });
    postCapDuration.add(Date.now() - t);
    if (res.status !== 200 && res.status !== 201) {
      console.warn(`post-cap ${i}: status=${res.status}`);
    }
  }

  // 로그 건수 확인
  const logsRes = getLogs(epId, cookieHeader);
  check(logsRes, { 'logs endpoint ok': (r) => r.status === 200 });
  console.log(`최종 로그 조회 응답: ${logsRes.body.substring(0, 200)}`);

  console.log('\n=== S8 결과 요약 ===');
  console.log('pre-cap 구간: p95/p99는 k6 결과 참조');
  console.log('post-cap 구간: enforceLogCap 발동 시 응답 지연 증가 여부 확인 필요');
}

export function teardown() {
  cleanup();
}
