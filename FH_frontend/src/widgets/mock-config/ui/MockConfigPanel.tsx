import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateMockConfigMutation } from '@/entities/endpoint/api/endpoint.queries';
import type { Endpoint } from '@/entities/endpoint/model/endpoint.schema';
import styles from './MockConfigPanel.module.css';

interface MockConfigPanelProps {
  endpoint: Endpoint;
}

const PRESETS = [
  { label: 'DEFAULT', desc: '(200 OK)', status: 200, body: 'ok' },
  { label: 'TOSS_PAYMENTS', desc: '(400 ERROR)', status: 400, body: '{\n  "code": "INVALID_API_KEY",\n  "message": "잘못된 시크릿 키 연동입니다."\n}' },
  { label: 'KAKAO_LOGIN', desc: '(401 ERROR)', status: 401, body: '{\n  "msg": "this access token does not exist",\n  "code": -401\n}' },
  { label: 'PORTONE', desc: '(500 ERROR)', status: 500, body: '{\n  "code": -1,\n  "message": "Internal Server Error"\n}' }
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
  { value: 'Content-Type', label: 'Content-Type' },
  { value: 'Authorization', label: 'Authorization' },
  { value: 'Cache-Control', label: 'Cache-Control' },
  { value: 'Access-Control-Allow-Origin', label: 'Access-Control-Allow-Origin' },
  { value: 'X-Webhook-Signature', label: 'X-Webhook-Signature' },
  { value: 'X-Custom-Header', label: 'X-Custom-Header' }
];

const COMMON_HEADER_VALUES = [
  { value: 'application/json', label: 'application/json' },
  { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
  { value: 'text/plain', label: 'text/plain' },
  { value: 'Bearer <token>', label: 'Bearer <token>' },
  { value: 'no-cache', label: 'no-cache' },
  { value: '*', label: '*' }
];

const clampOrFallback = (raw: string, min: number, max: number, fallback: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function CustomDropdown({ 
  value, 
  options, 
  onSelect, 
  onCustom, 
  customLabel, 
  placeholder, 
  isOpen, 
  onToggle, 
  isCustomStatus,
  displayValue
}: {
  value: string | number;
  options: { value: string | number; label: string; desc?: string }[];
  onSelect: (val: string | number) => void;
  onCustom?: () => void;
  customLabel?: string;
  placeholder: string;
  isOpen: boolean;
  onToggle: () => void;
  isCustomStatus?: boolean;
  displayValue?: (val: string | number, opt?: { value: string | number; label: string; desc?: string }) => string;
  alignRight?: boolean;
}) {
  const selected = options.find(o => o.value === value);
  const isCustom = isCustomStatus ?? (!selected && value !== '');

  return (
    <div className={styles.statusInputWrapper}>
      <div className={styles.customSelectTrigger} onClick={onToggle}>
        <span className={styles.customSelectText}>
          {isCustom && customLabel
            ? `${customLabel}: ${value}` 
            : (selected ? (displayValue ? displayValue(value, selected) : `${selected.value !== selected.label ? selected.value + ' ' : ''}${selected.label}`) : placeholder)}
        </span>
        <span className={styles.customSelectIcon}>▼</span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={styles.customSelectDropdown}
            style={alignRight ? { right: 0, left: 'auto' } : undefined}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {options.map(o => (
              <div 
                key={String(o.value)} 
                className={`${styles.customSelectOption} ${value === o.value && !isCustom ? styles.selected : ''}`}
                onClick={(e) => { e.stopPropagation(); onSelect(o.value); }}
              >
                {o.value !== o.label && <span className={styles.optionValue}>{o.value}</span>}
                <div className={styles.optionTextContainer}>
                  <span className={styles.optionLabel}>{o.label}</span>
                  {o.desc && <span className={styles.optionDesc}>{o.desc}</span>}
                </div>
              </div>
            ))}
            {onCustom && (
              <div 
                className={`${styles.customSelectOption} ${isCustom ? styles.selected : ''}`}
                onClick={(e) => { e.stopPropagation(); onCustom(); }}
              >
                <span className={styles.optionValue}>Custom...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MockConfigPanel({ endpoint }: MockConfigPanelProps) {
  const { mutate, isPending } = useUpdateMockConfigMutation(endpoint.endpointId);
  const [statusCode, setStatusCode] = useState<number | string>(endpoint.mockConfig?.statusCode || 200);
  const [isCustomStatus, setIsCustomStatus] = useState(() => {
    const code = endpoint.mockConfig?.statusCode || 200;
    return !COMMON_STATUS_CODES.some(c => c.value === code);
  });
  const [delayMs, setDelayMs] = useState(endpoint.mockConfig?.delayMs || 0);
  const [body, setBody] = useState(endpoint.mockConfig?.body || 'ok');
  
  const [headerList, setHeaderList] = useState<{id: string, key: string, value: string, isCustomKey: boolean, isCustomValue: boolean}[]>(() => {
    const headers = endpoint.mockConfig?.headers || {};
    return Object.entries(headers).map(([k, v]) => ({ 
      id: crypto.randomUUID(), 
      key: k, 
      value: String(v),
      isCustomKey: !COMMON_HEADER_KEYS.some(x => x.value === k),
      isCustomValue: !COMMON_HEADER_VALUES.some(x => x.value === String(v))
    }));
  });
  
  const [headerWarning, setHeaderWarning] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

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

  const applyPreset = (index: number) => {
    const preset = PRESETS[index];
    setStatusCode(preset.status);
    setIsCustomStatus(!COMMON_STATUS_CODES.some(c => c.value === preset.status));
    setBody(preset.body);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h2>[ MOCK_API_CONFIG ]</h2>
        <p>&gt; EXTERNAL_SERVICE_INTEGRATION_TEST_MODE</p>
      </div>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label>TARGET_PRESET</label>
          <CustomDropdown
            value={''}
            options={PRESETS.map((p, i) => ({ value: i, label: p.label, desc: p.desc }))}
            onSelect={(val) => {
              applyPreset(Number(val));
              setOpenDropdownId(null);
            }}
            placeholder="SELECT_PRESET..."
            isOpen={openDropdownId === 'preset'}
            onToggle={() => setOpenDropdownId(openDropdownId === 'preset' ? null : 'preset')}
            displayValue={(val, opt) => opt ? `${opt.label}` : 'SELECT_PRESET...'}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label>STATUS_CODE</label>
            <CustomDropdown
              value={statusCode}
              options={COMMON_STATUS_CODES}
              onSelect={(val) => {
                setStatusCode(val);
                setIsCustomStatus(false);
                setOpenDropdownId(null);
              }}
              onCustom={() => {
                setIsCustomStatus(true);
                setStatusCode('');
                setOpenDropdownId(null);
              }}
              customLabel="Custom"
              placeholder="Select Status..."
              isOpen={openDropdownId === 'status'}
              onToggle={() => setOpenDropdownId(openDropdownId === 'status' ? null : 'status')}
              isCustomStatus={isCustomStatus}
            />
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
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <CustomDropdown
                    value={h.key}
                    options={COMMON_HEADER_KEYS}
                    onSelect={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].key = String(val);
                      newHeaders[i].isCustomKey = false;
                      setHeaderList(newHeaders);
                      setOpenDropdownId(null);
                    }}
                    onCustom={() => {
                      const newHeaders = [...headerList];
                      newHeaders[i].key = '';
                      newHeaders[i].isCustomKey = true;
                      setHeaderList(newHeaders);
                      setOpenDropdownId(null);
                    }}
                    customLabel="Custom"
                    placeholder="Header Key"
                    isOpen={openDropdownId === `header-key-${h.id}`}
                    onToggle={() => setOpenDropdownId(openDropdownId === `header-key-${h.id}` ? null : `header-key-${h.id}`)}
                    isCustomStatus={h.isCustomKey}
                  />
                  {h.isCustomKey && (
                    <input
                      type="text"
                      placeholder="Custom Key"
                      value={h.key}
                      onChange={e => {
                        const newHeaders = [...headerList];
                        newHeaders[i].key = e.target.value;
                        setHeaderList(newHeaders);
                      }}
                      className={styles.input}
                    />
                  )}
                </div>
                
                <span className={styles.headerColon} style={{ marginTop: '0.6rem' }}>:</span>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <CustomDropdown
                    value={h.value}
                    options={COMMON_HEADER_VALUES}
                    onSelect={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = String(val);
                      newHeaders[i].isCustomValue = false;
                      setHeaderList(newHeaders);
                      setOpenDropdownId(null);
                    }}
                    onCustom={() => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = '';
                      newHeaders[i].isCustomValue = true;
                      setHeaderList(newHeaders);
                      setOpenDropdownId(null);
                    }}
                    customLabel="Custom"
                    placeholder="Header Value"
                    isOpen={openDropdownId === `header-value-${h.id}`}
                    onToggle={() => setOpenDropdownId(openDropdownId === `header-value-${h.id}` ? null : `header-value-${h.id}`)}
                    isCustomStatus={h.isCustomValue}
                    alignRight={true}
                  />
                  {h.isCustomValue && (
                    <input
                      type="text"
                      placeholder="Custom Value"
                      value={h.value}
                      onChange={e => {
                        const newHeaders = [...headerList];
                        newHeaders[i].value = e.target.value;
                        setHeaderList(newHeaders);
                      }}
                      className={styles.input}
                    />
                  )}
                </div>
                
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  onClick={() => setHeaderList(headerList.filter(item => item.id !== h.id))}
                  title="Remove Header"
                >✕</button>
              </div>
            ))}
            <button 
              type="button" 
              className={styles.addHeaderBtn} 
              onClick={() => setHeaderList([...headerList, { id: crypto.randomUUID(), key: '', value: '', isCustomKey: true, isCustomValue: true }])}
            >
              + ADD HEADER
            </button>
          </div>
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

