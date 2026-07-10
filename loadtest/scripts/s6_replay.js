import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { cleanup, createEndpointWithCookie, sendWebhook, getLogs, BASE_URL } from './helpers.js';

export const replaySuccess = new Counter('replay_success');
export const replayFailed = new Counter('replay_failed');

export const options = {
  scenarios: {
    replay: {
      executor: 'constant-arrival-rate',
      rate: 20, // 20 replays per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
};

export function setup() {
  cleanup();
  const { endpointId, cookieHeader } = createEndpointWithCookie('replay-source');
  const { endpointId: targetEpId } = createEndpointWithCookie('replay-target');
  if (!endpointId || !targetEpId) throw new Error('Endpoint creation failed');

  // Send a webhook to generate a log
  sendWebhook(endpointId, { idx: 0, payload: 'replay-target' });
  
  // Get the logId
  let logId = null;
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    sleep(0.5);
    const logsRes = getLogs(endpointId, cookieHeader);
    if (logsRes.status === 200) {
      const logs = JSON.parse(logsRes.body).content;
      if (logs && logs.length > 0) {
        logId = logs[0].logId;
        break;
      }
    }
  }

  if (!logId) throw new Error('Log generation failed');
  console.log(`S6 Setup: Created endpoint ${endpointId}, target ${targetEpId}, logId ${logId}`);
  
  return { endpointId, cookieHeader, logId, targetEpId };
}

export default function (data) {
  const { endpointId, cookieHeader, logId, targetEpId } = data;
  
  const payload = JSON.stringify({
    destinationUrl: `${BASE_URL}/api/hooks/${targetEpId}` // 유효한 웹훅 수신 엔드포인트
  });
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookieHeader
  };
  
  const res = http.post(`${BASE_URL}/api/endpoints/${endpointId}/logs/${logId}/replay`, payload, { headers });
  
  if (res.status === 200 || res.status === 201) {
    replaySuccess.add(1);
  } else if (res.status === 429) {
    replaySuccess.add(1); // 429 is expected due to 20/min replay rate limit
  } else {
    replayFailed.add(1);
  }
  
  check(res, {
    'replay 200 or 429': (r) => r.status === 200 || r.status === 201 || r.status === 429,
  });
}

export function teardown() {
  cleanup();
}
