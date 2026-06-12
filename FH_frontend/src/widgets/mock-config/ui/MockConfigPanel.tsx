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
  { label: 'PORTONE', desc: '(500 ERROR)', status: 500, body: '{\n  "code": -1,\n  "message": "Internal Server Error"\n}' },
  { label: 'CUSTOM', desc: '(Manual Config)', status: null, body: null }
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

const COMMON_DELAY_PRESETS = [
  { value: 0, label: '0ms', desc: '(Instant)' },
  { value: 500, label: '500ms', desc: '(Typical)' },
  { value: 1000, label: '1000ms', desc: '(1s)' },
  { value: 3000, label: '3000ms', desc: '(3s)' },
  { value: 5000, label: '5000ms', desc: '(5s)' },
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
  displayValue,
  alignRight,
  isEditable,
  onEdit,
  hideNoOptions
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
  isEditable?: boolean;
  onEdit?: (val: string) => void;
  hideNoOptions?: boolean;
}) {
  const selected = options.find(o => o.value === value);
  const isCustom = isCustomStatus ?? (!selected && value !== '');

  const filteredOptions = isEditable && value !== '' 
    ? options.filter(o => 
        String(o.label).toLowerCase().includes(String(value).toLowerCase()) || 
        String(o.value).toLowerCase().includes(String(value).toLowerCase())
      )
    : options;

  return (
    <div className={styles.statusInputWrapper}>
      <div 
        className={styles.customSelectTrigger} 
        onClick={!isEditable ? onToggle : undefined}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={!isEditable ? 0 : -1}
        onKeyDown={!isEditable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
        } : undefined}
      >
        {isEditable ? (
          <input 
            type="text" 
            className={styles.customSelectInput}
            value={value} 
            onChange={e => {
               if (onEdit) onEdit(e.target.value);
               if (!isOpen) onToggle();
            }}
            onFocus={() => { if (!isOpen) onToggle(); }}
            placeholder={placeholder}
          />
        ) : (
          <span className={styles.customSelectText}>
            {isCustom
              ? (customLabel ? `${customLabel}: ${value}` : (value || placeholder))
              : (selected ? (displayValue ? displayValue(value, selected) : `${selected.value !== selected.label ? selected.value + ' ' : ''}${selected.label}`) : placeholder)}
          </span>
        )}
        <span className={styles.customSelectIcon} onClick={(e) => { e.stopPropagation(); onToggle(); }}>▼</span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={styles.customSelectDropdown}
            role="listbox"
            style={alignRight ? { right: 0, left: 'auto' } : undefined}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {filteredOptions.length > 0 ? filteredOptions.map(o => (
              <div 
                key={String(o.value)} 
                className={`${styles.customSelectOption} ${value === o.value && !isCustom ? styles.selected : ''}`}
                role="option"
                aria-selected={value === o.value && !isCustom}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(o.value); }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); 
                  onSelect(o.value); 
                }}
              >
                {o.value !== o.label && <span className={styles.optionValue}>{o.value}</span>}
                <div className={styles.optionTextContainer}>
                  <span className={styles.optionLabel}>{o.label}</span>
                  {o.desc && <span className={styles.optionDesc}>{o.desc}</span>}
                </div>
              </div>
            )) : (
              !hideNoOptions && (
                <div className={styles.customSelectOption} style={{ opacity: 0.5 }}>
                  <span className={styles.optionLabel}>No matching options</span>
                </div>
              )
            )}
            {onCustom && !isEditable && (
              <div 
                className={`${styles.customSelectOption} ${isCustom ? styles.selected : ''}`}
                role="option"
                aria-selected={isCustom}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCustom(); }
                }}
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
  const [delayMs, setDelayMs] = useState<number | string>(endpoint.mockConfig?.delayMs || 0);
  const [body, setBody] = useState(endpoint.mockConfig?.body || 'ok');
  
  const [presetIdx, setPresetIdx] = useState<number | string>(() => {
    const code = endpoint.mockConfig?.statusCode || 200;
    const b = endpoint.mockConfig?.body || 'ok';
    const found = PRESETS.findIndex(p => p.status === code && p.body === b);
    return found !== -1 ? found : 4; // 4 is CUSTOM
  });

  const [headerList, setHeaderList] = useState<{id: string, key: string, value: string}[]>(() => {
    const headers = endpoint.mockConfig?.headers || {};
    return Object.entries(headers).map(([k, v]) => ({ 
      id: crypto.randomUUID(), 
      key: k, 
      value: String(v)
    }));
  });
  
  const [headerWarning, setHeaderWarning] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close dropdown if the click happens outside any CustomDropdown trigger/menu
      if (!target.closest(`.${styles.statusInputWrapper}`)) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleApply = () => {
    setHeaderWarning(null);
    
    const sCode = Number(statusCode) || 200;
    const dMs = Number(delayMs) || 0;
    
    if (sCode < 100 || sCode > 599) {
      setHeaderWarning('ERROR: STATUS_CODE MUST BE 100-599');
      return;
    }
    if (dMs < 0 || dMs > 10000) {
      setHeaderWarning('ERROR: DELAY MUST BE 0-10000ms');
      return;
    }

    const headers: Record<string, string> = {};
    let hasInvalidLines = false;

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
      statusCode: sCode,
      delayMs: dMs,
      body,
      headers
    });
  };

  const applyPreset = (index: number) => {
    setPresetIdx(index);
    if (index === 4) return; // Custom
    const preset = PRESETS[index];
    setStatusCode(preset.status as number);
    setIsCustomStatus(!COMMON_STATUS_CODES.some(c => c.value === preset.status));
    setBody(preset.body as string);
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
            value={presetIdx}
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
                setPresetIdx(4);
                setOpenDropdownId(null);
              }}
              onCustom={() => {
                setIsCustomStatus(true);
                setStatusCode('');
                setPresetIdx(4);
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
                onChange={e => {
                  setStatusCode(Number(e.target.value));
                  setPresetIdx(4);
                }}
                className={styles.input}
                style={{ marginTop: '0.5rem' }}
              />
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label>RESPONSE_DELAY (ms)</label>
            <CustomDropdown
              value={delayMs}
              options={COMMON_DELAY_PRESETS}
              onSelect={(val) => {
                setDelayMs(val);
                setPresetIdx(4);
                setOpenDropdownId(null);
              }}
              placeholder="e.g., 500"
              isOpen={openDropdownId === 'delay'}
              onToggle={() => setOpenDropdownId(openDropdownId === 'delay' ? null : 'delay')}
              isEditable={true}
              onEdit={(val) => {
                setDelayMs(val.replace(/[^0-9]/g, ''));
                setPresetIdx(4);
              }}
              hideNoOptions={true}
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
                      setHeaderList(newHeaders);
                      setPresetIdx(4);
                      setOpenDropdownId(null);
                    }}
                    placeholder="Key"
                    isOpen={openDropdownId === `header-key-${h.id}`}
                    onToggle={() => setOpenDropdownId(openDropdownId === `header-key-${h.id}` ? null : `header-key-${h.id}`)}
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].key = val;
                      setHeaderList(newHeaders);
                      setPresetIdx(4);
                    }}
                  />
                </div>
                
                <span className={styles.headerColon}>:</span>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <CustomDropdown
                    value={h.value}
                    options={COMMON_HEADER_VALUES}
                    onSelect={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = String(val);
                      setHeaderList(newHeaders);
                      setPresetIdx(4);
                      setOpenDropdownId(null);
                    }}
                    placeholder="Value"
                    isOpen={openDropdownId === `header-value-${h.id}`}
                    onToggle={() => setOpenDropdownId(openDropdownId === `header-value-${h.id}` ? null : `header-value-${h.id}`)}
                    alignRight={true}
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = val;
                      setHeaderList(newHeaders);
                      setPresetIdx(4);
                    }}
                  />
                </div>
                
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={() => {
                    setHeaderList(headerList.filter(item => item.id !== h.id));
                    setPresetIdx(4);
                  }}
                  title="Remove Header"
                >✕</button>
              </div>
            ))}
            <button 
              type="button" 
              className={styles.addHeaderBtn} 
              onClick={() => {
                setHeaderList([...headerList, { id: crypto.randomUUID(), key: '', value: '' }]);
                setPresetIdx(4);
              }}
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
            onChange={e => {
              setBody(e.target.value);
              setPresetIdx(4);
            }} 
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
