import { useState } from 'react';
import { useUpdateMockConfigMutation } from '@/entities/endpoint/api/endpoint.queries';
import type { Endpoint } from '@/entities/endpoint/model/endpoint.schema';
import styles from './MockConfigPanel.module.css';

interface MockConfigPanelProps {
  endpoint: Endpoint;
}

const PRESETS = [
  { label: 'DEFAULT (200 OK)', status: 200, body: 'ok' },
  { label: 'TOSS_PAYMENTS (400 ERROR)', status: 400, body: '{\n  "code": "INVALID_API_KEY",\n  "message": "잘못된 시크릿 키 연동입니다."\n}' },
  { label: 'KAKAO_LOGIN (401 ERROR)', status: 401, body: '{\n  "msg": "this access token does not exist",\n  "code": -401\n}' },
  { label: 'PORTONE (500 ERROR)', status: 500, body: '{\n  "code": -1,\n  "message": "Internal Server Error"\n}' }
];

const clampOrFallback = (raw: string, min: number, max: number, fallback: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export default function MockConfigPanel({ endpoint }: MockConfigPanelProps) {
  const { mutate, isPending } = useUpdateMockConfigMutation(endpoint.endpointId);
  const [statusCode, setStatusCode] = useState(endpoint.mockConfig?.statusCode || 200);
  const [delayMs, setDelayMs] = useState(endpoint.mockConfig?.delayMs || 0);
  const [body, setBody] = useState(endpoint.mockConfig?.body || 'ok');
  const [headersText, setHeadersText] = useState(() => {
    const headers = endpoint.mockConfig?.headers || {};
    return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
  });
  const [headerWarning, setHeaderWarning] = useState<string | null>(null);

  const handleApply = () => {
    const headers: Record<string, string> = {};
    let hasInvalidLines = false;
    setHeaderWarning(null);

    headersText.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const [k, ...v] = trimmed.split(':');
      if (k && v.length) {
        headers[k.trim()] = v.join(':').trim();
      } else {
        hasInvalidLines = true;
      }
    });

    if (hasInvalidLines) {
      setHeaderWarning('INVALID_HEADER_FORMAT_IGNORED');
    }

    mutate({
      statusCode,
      delayMs,
      body,
      headers
    });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setStatusCode(preset.status);
    setBody(preset.body);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>[ MOCK_API_CONFIG ]</h2>
        <p>&gt; EXTERNAL_SERVICE_INTEGRATION_TEST_MODE</p>
      </div>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="select-preset">TARGET_PRESET</label>
          <select 
            id="select-preset" 
            name="preset" 
            onChange={(e) => applyPreset(PRESETS[Number(e.target.value)])} 
            defaultValue="" 
            className={styles.select}
          >
            <option value="" disabled>SELECT_PRESET...</option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label htmlFor="input-status-code">STATUS_CODE</label>
            <input 
              id="input-status-code"
              name="statusCode"
              type="number" 
              min="100"
              max="599"
              value={statusCode} 
              onChange={e => setStatusCode(prev => clampOrFallback(e.target.value, 100, 599, prev))} 
              className={styles.input}
              autoComplete="off"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="input-delay">RESPONSE_DELAY (ms)</label>
            <input 
              id="input-delay"
              name="delayMs"
              type="number" 
              min="0" 
              max="10000" 
              value={delayMs} 
              onChange={e => setDelayMs(prev => clampOrFallback(e.target.value, 0, 10000, prev))} 
              className={styles.input}
              autoComplete="off"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="input-headers">RESPONSE_HEADERS (Key: Value)</label>
          <textarea 
            id="input-headers"
            name="headers"
            value={headersText} 
            onChange={e => setHeadersText(e.target.value)} 
            className={styles.textarea}
            rows={3}
            placeholder="Content-Type: application/json"
            spellCheck={false}
            autoComplete="off"
          />
          {headerWarning && <p className={styles.warning}>{headerWarning}</p>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="input-body">RESPONSE_BODY</label>
          <textarea 
            id="input-body"
            name="body"
            value={body} 
            onChange={e => setBody(e.target.value)} 
            className={`${styles.textarea} ${styles.bodyArea}`}
            rows={8}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button 
          onClick={handleApply} 
          disabled={isPending}
          className={styles.button}
        >
          {isPending ? 'SAVING_CONFIG...' : 'APPLY_CONFIG'}
        </button>
      </div>
    </div>
  );
}
