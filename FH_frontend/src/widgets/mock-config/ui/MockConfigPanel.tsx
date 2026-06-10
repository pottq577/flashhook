import { useState } from 'react';
import { useUpdateMockConfigMutation } from '@/entities/endpoint/api/endpoint.queries';
import type { Endpoint } from '@/entities/endpoint/model/endpoint.schema';
import styles from './MockConfigPanel.module.css';

interface MockConfigPanelProps {
  endpoint: Endpoint;
}

const PRESETS = [
  { label: '기본 (200 OK)', status: 200, body: 'ok' },
  { label: 'Toss Payments (400 Error)', status: 400, body: '{\n  "code": "INVALID_API_KEY",\n  "message": "잘못된 시크릿 키 연동입니다."\n}' },
  { label: 'Kakao Login (401 Error)', status: 401, body: '{\n  "msg": "this access token does not exist",\n  "code": -401\n}' },
  { label: 'PortOne (500 Error)', status: 500, body: '{\n  "code": -1,\n  "message": "Internal Server Error"\n}' }
];

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
      setHeaderWarning('일부 헤더 형식이 올바르지 않아 무시되었습니다. (Key: Value 형식 확인)');
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
        <h2>Mock API 설정</h2>
        <p>외부 서비스 연동 테스트를 위해 커스텀 응답을 설정합니다.</p>
      </div>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label>K-API 프리셋</label>
          <select onChange={(e) => applyPreset(PRESETS[Number(e.target.value)])} defaultValue="" className={styles.select}>
            <option value="" disabled>프리셋 선택...</option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label>상태 코드 (Status Code)</label>
            <input 
              type="number" 
              min="100"
              max="599"
              value={statusCode} 
              onChange={e => setStatusCode(Math.min(599, Math.max(100, Number(e.target.value))))} 
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>응답 지연 (Delay ms)</label>
            <input 
              type="number" 
              min="0" 
              max="10000" 
              value={delayMs} 
              onChange={e => setDelayMs(Math.min(10000, Math.max(0, Number(e.target.value))))} 
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>응답 헤더 (Key: Value 형태로 한 줄씩 입력)</label>
          <textarea 
            value={headersText} 
            onChange={e => setHeadersText(e.target.value)} 
            className={styles.textarea}
            rows={3}
            placeholder="Content-Type: application/json"
          />
          {headerWarning && <p className={styles.warning}>{headerWarning}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>응답 본문 (Body)</label>
          <textarea 
            value={body} 
            onChange={e => setBody(e.target.value)} 
            className={`${styles.textarea} ${styles.bodyArea}`}
            rows={8}
          />
        </div>

        <button 
          onClick={handleApply} 
          disabled={isPending}
          className={styles.button}
        >
          {isPending ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
