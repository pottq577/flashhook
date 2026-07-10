/**
 * helpers.js — 공통 헬퍼 및 상수
 * FlashHook 부하 테스트 공용 모듈
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const ADMIN_KEY = __ENV.ADMIN_KEY;
if (!ADMIN_KEY) throw new Error('ADMIN_KEY 환경변수가 필요합니다');

// 커스텀 메트릭
export const http429Count = new Counter('http_429_count');
export const webhookReceivedCount = new Counter('webhook_received_count');
export const webhookSuccessCount = new Counter('webhook_success_count');

/**
 * 엔드포인트 생성 후 {endpointId, jar} 반환
 * jar: k6 CookieJar (쿠키 기반 인증용)
 */
export function createEndpointWithCookie(label = 'loadtest') {
  const res = http.post(`${BASE_URL}/api/endpoints`, JSON.stringify({ label }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 429) {
    http429Count.add(1);
    return { endpointId: null, cookieHeader: null };
  }
  if (!check(res, { 'create endpoint 201': (r) => r.status === 201 || r.status === 200 })) {
    return { endpointId: null, cookieHeader: null };
  }
  try {
    const endpointId = JSON.parse(res.body).endpointId;
    let cookieHeader = null;
    const setCookie = res.headers['Set-Cookie'];
    if (setCookie) {
      cookieHeader = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];
    }
    return { endpointId, cookieHeader };
  } catch {
    return { endpointId: null, cookieHeader: null };
  }
}

/**
 * 엔드포인트 생성 후 endpointId만 반환 (기존 호환)
 */
export function createEndpoint(label = 'loadtest') {
  const { endpointId } = createEndpointWithCookie(label);
  return endpointId;
}

/**
 * 웹훅 전송
 * @param {string} endpointId
 * @param {object} payload
 * @param {string} [clientIp] - CF-Connecting-IP 스푸핑 (로컬 전용)
 */
export function sendWebhook(endpointId, payload, clientIp = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientIp) {
    headers['CF-Connecting-IP'] = clientIp;
  }
  const body = JSON.stringify(payload);
  const res = http.post(`${BASE_URL}/api/hooks/${endpointId}`, body, { headers });
  webhookReceivedCount.add(1);
  if (res.status === 429) {
    http429Count.add(1);
    return res;
  }
  if (res.status >= 200 && res.status < 300) {
    webhookSuccessCount.add(1);
  }
  return res;
}

/**
 * 로그 목록 조회 (쿠키 인증 필요)
 */
export function getLogs(endpointId, cookieHeader) {
  const headers = {};
  if (cookieHeader) headers['Cookie'] = cookieHeader;
  return http.get(`${BASE_URL}/api/endpoints/${endpointId}/logs`, { headers });
}


/**
 * 클린업: Redis + MongoDB 전체 정리 (local 프로파일, 부하테스트 전용)
 */
export function cleanup() {
  const headers = { 'X-Admin-Key': ADMIN_KEY };
  const rRes = http.post(`${BASE_URL}/api/test/cleanup/redis`, null, { headers });
  const mRes = http.post(`${BASE_URL}/api/test/cleanup/mongo`, null, { headers });
  check(rRes, { 'redis cleanup ok': (r) => r.status === 200 });
  check(mRes, { 'mongo cleanup ok': (r) => r.status === 200 });
  console.log(`Cleanup: redis=${rRes.status}, mongo=${mRes.status}`);
}

/**
 * 랜덤 IP 생성 (CF-Connecting-IP 스푸핑용)
 */
export function randomIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * 배열에서 랜덤 요소 반환
 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
