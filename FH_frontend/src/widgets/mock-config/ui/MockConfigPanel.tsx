import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const COMMON_STATUS_CODES = [
  { value: 200, label: 'OK', desc: '(Success)' },
  { value: 201, label: 'Created', desc: '' },
  { value: 400, label: 'Bad Request', desc: '(Invalid Parameters)' },
  { value: 401, label: 'Unauthorized', desc: '(Invalid Token)' },
  { value: 403, label: 'Forbidden', desc: '' },
  { value: 404, label: 'Not Found', desc: '' },
  { value: 429, label: 'Too Many Requests', desc: '' },
  { value: 500, label: 'Internal Server Error', desc: '' },
  { value: 502, label: 'Bad Gateway', desc: '' },
  { value: 503, label: 'Service Unavailable', desc: '' },
];

const COMMON_HEADER_KEYS = [
  'Content-Type',
  'Authorization',
  'Cache-Control',
  'Access-Control-Allow-Origin',
  'X-Webhook-Signature',
  'X-Custom-Header'
];

const COMMON_HEADER_VALUES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'text/plain',
  'Bearer <token>',
  'no-cache',
  '*'
];

const clampOrFallback = (raw: string, min: number, max: number, fallback: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export default function MockConfigPanel({ endpoint }: MockConfigPanelProps) {
  const { mutate, isPending } = useUpdateMockConfigMutation(endpoint.endpointId);
  const [statusCode, setStatusCode] = useState<number | string>(endpoint.mockConfig?.statusCode || 200);
  const [isCustomStatus, setIsCustomStatus] = useState(() => {
    const code = endpoint.mockConfig?.statusCode || 200;
    return !COMMON_STATUS_CODES.some(c => c.value === code);
  });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [delayMs, setDelayMs] = useState(endpoint.mockConfig?.delayMs || 0);
  const [body, setBody] = useState(endpoint.mockConfig?.body || 'ok');
  
  const [headerList, setHeaderList] = useState<{id: string, key: string, value: string}[]>(() => {
    const headers = endpoint.mockConfig?.headers || {};
    return Object.entries(headers).map(([k, v]) => ({ id: crypto.randomUUID(), key: k, value: String(v) }));
  });
  
  const [headerWarning, setHeaderWarning] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    if (isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStatusDropdownOpen]);

  const handleApply = () => {
    const headers: Record<string, string> = {};
    let hasInvalidLines = false;
    setHeaderWarning(null);

    headerList.forEach(h => {
      const k = h.key.trim();
      const v = h.value.trim();
      if (k) {
        headers[k] = v;
      } else if (v) {
        hasInvalidLines = true;
      }
    });

    if (hasInvalidLines) {
      setHeaderWarning('WARNING: EMPTY_KEY_IGNORED');
    }

    mutate({
      statusCode: Number(statusCode) || 200,
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
            <label>STATUS_CODE</label>
            <div className={styles.statusInputWrapper} ref={dropdownRef}>
              <div 
                className={styles.customSelectTrigger} 
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <span className={styles.customSelectText}>
                  {isCustomStatus 
                    ? `Custom: ${statusCode}` 
                    : (() => {
                        const s = COMMON_STATUS_CODES.find(c => c.value === Number(statusCode));
                        return s ? `${s.value} ${s.label}` : 'Select Status...';
                      })()
                  }
                </span>
                <span className={styles.customSelectIcon}>▼</span>
              </div>
              
              <AnimatePresence>
                {isStatusDropdownOpen && (
                  <motion.div 
                    className={styles.customSelectDropdown}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    {COMMON_STATUS_CODES.map(c => (
                      <div 
                        key={c.value} 
                        className={`${styles.customSelectOption} ${Number(statusCode) === c.value && !isCustomStatus ? styles.selected : ''}`}
                        onClick={() => {
                          setStatusCode(c.value);
                          setIsCustomStatus(false);
                          setIsStatusDropdownOpen(false);
                        }}
                      >
                        <span className={styles.optionValue}>{c.value}</span>
                        <div className={styles.optionTextContainer}>
                          <span className={styles.optionLabel}>{c.label}</span>
                          {c.desc && <span className={styles.optionDesc}>{c.desc}</span>}
                        </div>
                      </div>
                    ))}
                    <div 
                      className={`${styles.customSelectOption} ${isCustomStatus ? styles.selected : ''}`}
                      onClick={() => {
                        setIsCustomStatus(true);
                        setStatusCode('');
                        setIsStatusDropdownOpen(false);
                      }}
                    >
                      <span className={styles.optionValue}>Custom...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isCustomStatus && (
                <input 
                  type="number"
                  min="100" max="599"
                  placeholder="e.g., 418"
                  value={statusCode}
                  onChange={e => setStatusCode(Number(e.target.value))}
                  className={styles.input}
                  style={{ marginTop: '0.5rem' }}
                />
              )}
            </div>
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
          <label>RESPONSE_HEADERS</label>
          <div className={styles.headerList}>
            {headerList.map((h, i) => (
              <div key={h.id} className={styles.headerRow}>
                <input
                  type="text"
                  placeholder="Key"
                  value={h.key}
                  onChange={e => {
                    const newHeaders = [...headerList];
                    newHeaders[i].key = e.target.value;
                    setHeaderList(newHeaders);
                  }}
                  className={`${styles.input} ${styles.headerInput}`}
                  list="header-keys"
                />
                <span className={styles.headerColon}>:</span>
                <input
                  type="text"
                  placeholder="Value"
                  value={h.value}
                  onChange={e => {
                    const newHeaders = [...headerList];
                    newHeaders[i].value = e.target.value;
                    setHeaderList(newHeaders);
                  }}
                  className={`${styles.input} ${styles.headerInput}`}
                  list="header-values"
                />
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={() => setHeaderList(headerList.filter(item => item.id !== h.id))}
                  title="Remove Header"
                >✕</button>
              </div>
            ))}
            <button 
              type="button" 
              className={styles.addHeaderBtn} 
              onClick={() => setHeaderList([...headerList, { id: crypto.randomUUID(), key: '', value: '' }])}
            >
              + ADD HEADER
            </button>
          </div>
          {headerWarning && <p className={styles.warning}>{headerWarning}</p>}

          <datalist id="header-keys">
            {COMMON_HEADER_KEYS.map(k => <option key={k} value={k} />)}
          </datalist>
          <datalist id="header-values">
            {COMMON_HEADER_VALUES.map(v => <option key={v} value={v} />)}
          </datalist>
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
