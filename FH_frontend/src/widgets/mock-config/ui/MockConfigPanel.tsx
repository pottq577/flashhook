import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateMockConfigMutation } from '@/entities/endpoint/api/endpoint.queries';
import type { Endpoint } from '@/entities/endpoint/model/endpoint.schema';
import {
  PRESET_CATALOG,
  CUSTOM_SERVICE_ID,
  type PresetScenario,
} from '@/entities/endpoint/model/presets';
import styles from './MockConfigPanel.module.css';

interface MockConfigPanelProps {
  endpoint: Endpoint;
}

const COMMON_STATUS_CODES = [
  { value: 200, label: 'OK', desc: '(Success)' },
  { value: 201, label: 'Created', desc: '' },
  { value: 400, label: 'Bad Request', desc: '(Invalid Parameters)' },
  { value: 401, label: 'Unauthorized', desc: '(Invalid Token)' },
  { value: 403, label: 'Forbidden', desc: '' },
  { value: 404, label: 'Not Found', desc: '' },
  { value: 409, label: 'Conflict', desc: '(Duplicate)' },
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
  { value: 3500, label: '3500ms', desc: '(Kakao timeout)' },
  { value: 5000, label: '5000ms', desc: '(5s)' },
];

const COMMON_HEADER_KEYS = [
  { value: 'Content-Type', label: 'Content-Type' },
  { value: 'Authorization', label: 'Authorization' },
  { value: 'Cache-Control', label: 'Cache-Control' },
  { value: 'Access-Control-Allow-Origin', label: 'Access-Control-Allow-Origin' },
  { value: 'X-Webhook-Signature', label: 'X-Webhook-Signature' },
  { value: 'X-Custom-Header', label: 'X-Custom-Header' },
];

const COMMON_HEADER_VALUES = [
  { value: 'application/json', label: 'application/json' },
  { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
  { value: 'text/plain', label: 'text/plain' },
  { value: 'Bearer <token>', label: 'Bearer <token>' },
  { value: 'no-cache', label: 'no-cache' },
  { value: '*', label: '*' },
];

const SERVICE_OPTIONS = [
  ...PRESET_CATALOG.map((s) => ({ value: s.id, label: s.label })),
  { value: CUSTOM_SERVICE_ID, label: 'CUSTOM', desc: '(Manual Config)' },
];

function isHeadersEqual(presetHeaders: Record<string, string>, currentHeaders: Record<string, string> = {}): boolean {
  const presetKeys = Object.keys(presetHeaders);
  const currentKeys = Object.keys(currentHeaders);
  if (presetKeys.length !== currentKeys.length) return false;
  return presetKeys.every((key) => presetHeaders[key] === currentHeaders[key]);
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

function findInitialServiceId(cfg: Endpoint['mockConfig']): string {
  if (!cfg) return CUSTOM_SERVICE_ID;
  for (const service of PRESET_CATALOG) {
    for (const scenario of service.scenarios) {
      if (
        scenario.statusCode === cfg.statusCode &&
        scenario.delayMs === (cfg.delayMs ?? 0) &&
        scenario.body === (cfg.body ?? 'ok') &&
        isHeadersEqual(scenario.headers, cfg.headers)
      ) {
        return service.id;
      }
    }
  }
  return CUSTOM_SERVICE_ID;
}

function findInitialScenarioId(
  cfg: Endpoint['mockConfig'],
  serviceId: string,
): string | null {
  if (!cfg || serviceId === CUSTOM_SERVICE_ID) return null;
  const service = PRESET_CATALOG.find((s) => s.id === serviceId);
  if (!service) return null;
  const match = service.scenarios.find(
    (s) =>
      s.statusCode === cfg.statusCode &&
      s.delayMs === (cfg.delayMs ?? 0) &&
      s.body === (cfg.body ?? 'ok') &&
      isHeadersEqual(s.headers, cfg.headers)
  );
  return match?.id ?? null;
}

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
  hideNoOptions,
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
  displayValue?: (
    val: string | number,
    opt?: { value: string | number; label: string; desc?: string },
  ) => string;
  alignRight?: boolean;
  isEditable?: boolean;
  onEdit?: (val: string) => void;
  hideNoOptions?: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  const isCustom = isCustomStatus ?? (!selected && value !== '');

  const [inputValue, setInputValue] = useState(String(value));
  const [prevValue, setPrevValue] = useState(String(value));
  
  if (String(value) !== prevValue) {
    setPrevValue(String(value));
    setInputValue(String(value));
  }

  const filteredOptions =
    isEditable && inputValue !== ''
      ? options.filter(
          (o) =>
            String(o.label).toLowerCase().includes(inputValue.toLowerCase()) ||
            String(o.value).toLowerCase().includes(inputValue.toLowerCase()),
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
        onKeyDown={
          !isEditable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
      >
        {isEditable ? (
          <input
            type="text"
            className={styles.customSelectInput}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (onEdit) onEdit(e.target.value);
              if (!isOpen) onToggle();
            }}
            onFocus={() => {
              if (!isOpen) onToggle();
            }}
            placeholder={placeholder}
          />
        ) : (
          <span className={styles.customSelectText}>
            {isCustom
              ? customLabel
                ? `${customLabel}: ${value}`
                : value || placeholder
              : selected
                ? displayValue
                  ? displayValue(value, selected)
                  : `${selected.value !== selected.label ? selected.value + ' ' : ''}${selected.label}`
                : placeholder}
          </span>
        )}
        <span
          className={styles.customSelectIcon}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          ▼
        </span>
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
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o) => (
                <div
                  key={String(o.value)}
                  className={`${styles.customSelectOption} ${value === o.value && !isCustom ? styles.selected : ''}`}
                  role="option"
                  aria-selected={value === o.value && !isCustom}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(o.value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(o.value);
                  }}
                >
                  {o.value !== o.label && (
                    <span className={styles.optionValue}>{o.value}</span>
                  )}
                  <div className={styles.optionTextContainer}>
                    <span className={styles.optionLabel}>{o.label}</span>
                    {o.desc && <span className={styles.optionDesc}>{o.desc}</span>}
                  </div>
                </div>
              ))
            ) : (
              !hideNoOptions && (
                <div
                  className={styles.customSelectOption}
                  style={{ opacity: 0.5 }}
                >
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
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCustom();
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustom();
                }}
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

  const [selectedServiceId, setSelectedServiceId] = useState<string>(() =>
    findInitialServiceId(endpoint.mockConfig),
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(() =>
    findInitialScenarioId(
      endpoint.mockConfig,
      findInitialServiceId(endpoint.mockConfig),
    ),
  );

  const [statusCode, setStatusCode] = useState<number | string>(
    endpoint.mockConfig?.statusCode || 200,
  );
  const [isCustomStatus, setIsCustomStatus] = useState(() => {
    const code = endpoint.mockConfig?.statusCode || 200;
    return !COMMON_STATUS_CODES.some((c) => c.value === code);
  });
  const [delayMs, setDelayMs] = useState<number | string>(
    endpoint.mockConfig?.delayMs || 0,
  );
  const [body, setBody] = useState(endpoint.mockConfig?.body || 'ok');

  const [headerList, setHeaderList] = useState<
    { id: string; key: string; value: string }[]
  >(() => {
    const headers = endpoint.mockConfig?.headers || {};
    return Object.entries(headers).map(([k, v]) => ({
      id: generateId(),
      key: k,
      value: String(v),
    }));
  });

  const [headerWarning, setHeaderWarning] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [prevConfig, setPrevConfig] = useState(endpoint.mockConfig);

  if (endpoint.mockConfig !== prevConfig) {
    setPrevConfig(endpoint.mockConfig);
    setSelectedServiceId(findInitialServiceId(endpoint.mockConfig));
    setSelectedScenarioId(
      findInitialScenarioId(
        endpoint.mockConfig,
        findInitialServiceId(endpoint.mockConfig),
      ),
    );
    const code = endpoint.mockConfig?.statusCode || 200;
    setStatusCode(code);
    setIsCustomStatus(!COMMON_STATUS_CODES.some((c) => c.value === code));
    setDelayMs(endpoint.mockConfig?.delayMs || 0);
    setBody(endpoint.mockConfig?.body || 'ok');
    
    const headers = endpoint.mockConfig?.headers || {};
    setHeaderList(Object.entries(headers).map(([k, v]) => ({
      id: generateId(),
      key: k,
      value: String(v),
    })));
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(`.${styles.statusInputWrapper}`)) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const currentService =
    selectedServiceId !== CUSTOM_SERVICE_ID
      ? (PRESET_CATALOG.find((s) => s.id === selectedServiceId) ?? null)
      : null;

  const scenarioOptions =
    currentService?.scenarios.map((s) => ({
      value: s.id,
      label: s.label,
      desc: s.desc,
    })) ?? [];

  /** 수동 편집 시 서비스/시나리오 선택을 CUSTOM으로 초기화 */
  const resetToCustom = () => {
    setSelectedServiceId(CUSTOM_SERVICE_ID);
    setSelectedScenarioId(null);
  };

  /** 프리셋 시나리오 선택 → 4개 필드 전부 로드 */
  const applyScenario = (scenario: PresetScenario) => {
    setSelectedScenarioId(scenario.id);
    setStatusCode(scenario.statusCode);
    setIsCustomStatus(!COMMON_STATUS_CODES.some((c) => c.value === scenario.statusCode));
    setDelayMs(scenario.delayMs);
    setBody(scenario.body);
    setHeaderList(
      Object.entries(scenario.headers).map(([k, v]) => ({
        id: generateId(),
        key: k,
        value: String(v),
      })),
    );
  };

  const handleApply = () => {
    setHeaderWarning(null);

    const sCode = Number(statusCode);
    const dMs = Number(delayMs) || 0;

    if (String(statusCode).trim() === '' || isNaN(sCode) || sCode < 100 || sCode > 599) {
      setHeaderWarning('ERROR: STATUS_CODE MUST BE 100-599');
      return;
    }
    if (dMs < 0 || dMs > 10000) {
      setHeaderWarning('ERROR: DELAY MUST BE 0-10000ms');
      return;
    }

    const headers: Record<string, string> = {};
    let hasInvalidLines = false;

    headerList.forEach((h) => {
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
      headers,
      // 정적 프리셋: 항상 null → 동적 핸들러(Phase 2) 잔존 시 해제 보장
      presetType: null,
    });
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h2>[ MOCK_API_CONFIG ]</h2>
        <p>&gt; EXTERNAL_SERVICE_INTEGRATION_TEST_MODE</p>
      </div>

      <div className={styles.form}>
        {/* Level 1: 서비스 선택 */}
        <div className={styles.formGroup}>
          <label>TARGET_SERVICE</label>
          <CustomDropdown
            value={selectedServiceId}
            options={SERVICE_OPTIONS}
            onSelect={(val) => {
              setSelectedServiceId(String(val));
              setSelectedScenarioId(null);
              setOpenDropdownId(null);
            }}
            placeholder="SELECT_SERVICE..."
            isOpen={openDropdownId === 'service'}
            onToggle={() =>
              setOpenDropdownId(openDropdownId === 'service' ? null : 'service')
            }
            displayValue={(_val, opt) => (opt ? opt.label : 'SELECT_SERVICE...')}
          />
        </div>

        {/* Level 2: 시나리오 선택 (CUSTOM 이 아닐 때만 표시) */}
        {selectedServiceId !== CUSTOM_SERVICE_ID && (
          <div className={styles.formGroup}>
            <label>TARGET_PRESET</label>
            <CustomDropdown
              value={selectedScenarioId ?? ''}
              options={scenarioOptions}
              onSelect={(val) => {
                const scenario = currentService?.scenarios.find((s) => s.id === val);
                if (scenario) applyScenario(scenario);
                setOpenDropdownId(null);
              }}
              placeholder="SELECT_PRESET..."
              isOpen={openDropdownId === 'scenario'}
              onToggle={() =>
                setOpenDropdownId(openDropdownId === 'scenario' ? null : 'scenario')
              }
              displayValue={(_val, opt) => (opt ? opt.label : 'SELECT_PRESET...')}
            />
          </div>
        )}

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label>STATUS_CODE</label>
            <CustomDropdown
              value={statusCode}
              options={COMMON_STATUS_CODES}
              onSelect={(val) => {
                setStatusCode(val);
                setIsCustomStatus(false);
                resetToCustom();
                setOpenDropdownId(null);
              }}
              onCustom={() => {
                setIsCustomStatus(true);
                setStatusCode('');
                resetToCustom();
                setOpenDropdownId(null);
              }}
              customLabel="Custom"
              placeholder="Select Status..."
              isOpen={openDropdownId === 'status'}
              onToggle={() =>
                setOpenDropdownId(openDropdownId === 'status' ? null : 'status')
              }
              isCustomStatus={isCustomStatus}
            />
            {isCustomStatus && (
              <input
                type="number"
                min="100"
                max="599"
                placeholder="e.g., 418"
                value={statusCode}
                onChange={(e) => {
                  setStatusCode(Number(e.target.value));
                  resetToCustom();
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
                resetToCustom();
                setOpenDropdownId(null);
              }}
              placeholder="e.g., 500"
              isOpen={openDropdownId === 'delay'}
              onToggle={() =>
                setOpenDropdownId(openDropdownId === 'delay' ? null : 'delay')
              }
              isEditable={true}
              onEdit={(val) => {
                setDelayMs(val.replace(/[^0-9]/g, ''));
                resetToCustom();
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
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <CustomDropdown
                    value={h.key}
                    options={COMMON_HEADER_KEYS}
                    onSelect={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].key = String(val);
                      setHeaderList(newHeaders);
                      resetToCustom();
                      setOpenDropdownId(null);
                    }}
                    placeholder="Key"
                    isOpen={openDropdownId === `header-key-${h.id}`}
                    onToggle={() =>
                      setOpenDropdownId(
                        openDropdownId === `header-key-${h.id}`
                          ? null
                          : `header-key-${h.id}`,
                      )
                    }
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].key = val;
                      setHeaderList(newHeaders);
                      resetToCustom();
                    }}
                  />
                </div>

                <span className={styles.headerColon}>:</span>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <CustomDropdown
                    value={h.value}
                    options={COMMON_HEADER_VALUES}
                    onSelect={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = String(val);
                      setHeaderList(newHeaders);
                      resetToCustom();
                      setOpenDropdownId(null);
                    }}
                    placeholder="Value"
                    isOpen={openDropdownId === `header-value-${h.id}`}
                    onToggle={() =>
                      setOpenDropdownId(
                        openDropdownId === `header-value-${h.id}`
                          ? null
                          : `header-value-${h.id}`,
                      )
                    }
                    alignRight={true}
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = [...headerList];
                      newHeaders[i].value = val;
                      setHeaderList(newHeaders);
                      resetToCustom();
                    }}
                  />
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => {
                    setHeaderList(headerList.filter((item) => item.id !== h.id));
                    resetToCustom();
                  }}
                  title="Remove Header"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addHeaderBtn}
              onClick={() => {
                setHeaderList([
                  ...headerList,
                  { id: generateId(), key: '', value: '' },
                ]);
                resetToCustom();
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
            onChange={(e) => {
              setBody(e.target.value);
              resetToCustom();
            }}
            className={`${styles.textarea} ${styles.bodyArea}`}
            rows={8}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button
          onClick={handleApply}
          disabled={isPending || (selectedServiceId !== CUSTOM_SERVICE_ID && selectedScenarioId === null)}
          className={styles.button}
        >
          {isPending ? 'SAVING_CONFIG...' : 'APPLY_CONFIG'}
        </button>
      </div>
    </div>
  );
}
