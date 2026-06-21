import { useState, useRef, useEffect } from 'react';
import { useUpdateMockConfigMutation } from "@/entities/endpoint";
import type { Endpoint } from "@/entities/endpoint";
import {
  PRESET_CATALOG,
  CUSTOM_SERVICE_ID,
  type PresetScenario,
} from "@/entities/endpoint";
import { findInitialServiceId, findInitialScenarioId } from "@/entities/endpoint";
import { useToastStore } from '@/shared/lib/toast.store';

export const COMMON_STATUS_CODES = [
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

export const COMMON_STATUS_CODES_SET = new Set(COMMON_STATUS_CODES.map(c => c.value));

export const COMMON_DELAY_PRESETS = [
  { value: 0, label: '0ms', desc: '(Instant)' },
  { value: 500, label: '500ms', desc: '(Typical)' },
  { value: 1000, label: '1000ms', desc: '(1s)' },
  { value: 3000, label: '3000ms', desc: '(3s)' },
  { value: 3500, label: '3500ms', desc: '(Kakao timeout)' },
  { value: 5000, label: '5000ms', desc: '(5s)' },
];

export const COMMON_HEADER_KEYS = [
  { value: 'Content-Type', label: 'Content-Type' },
  { value: 'Authorization', label: 'Authorization' },
  { value: 'Cache-Control', label: 'Cache-Control' },
  { value: 'Access-Control-Allow-Origin', label: 'Access-Control-Allow-Origin' },
  { value: 'X-Webhook-Signature', label: 'X-Webhook-Signature' },
  { value: 'X-Custom-Header', label: 'X-Custom-Header' },
];

export const COMMON_HEADER_VALUES = [
  { value: 'application/json', label: 'application/json' },
  { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
  { value: 'text/plain', label: 'text/plain' },
  { value: 'Bearer <token>', label: 'Bearer <token>' },
  { value: 'no-cache', label: 'no-cache' },
  { value: '*', label: '*' },
];

export const SERVICE_OPTIONS = [
  ...PRESET_CATALOG.map((s) => ({ value: s.id, label: s.label })),
  { value: CUSTOM_SERVICE_ID, label: 'CUSTOM', desc: '(Manual Config)' },
];

export const generateId = () => crypto.randomUUID();

export function useMockConfigForm(endpoint: Endpoint) {
  const { mutate, isPending } = useUpdateMockConfigMutation(endpoint.endpointId);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isSaved, setIsSaved] = useState(false);
  const savedResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedResetTimerRef.current !== null) {
        window.clearTimeout(savedResetTimerRef.current);
      }
    };
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    return findInitialServiceId(endpoint.mockConfig);
  });
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(() => {
    const serviceId = findInitialServiceId(endpoint.mockConfig);
    return findInitialScenarioId(endpoint.mockConfig, serviceId);
  });

  const [statusCode, setStatusCode] = useState<number | string>(
    endpoint.mockConfig?.statusCode || 200,
  );
  const [isCustomStatus, setIsCustomStatus] = useState(() => {
    const code = endpoint.mockConfig?.statusCode || 200;
    return !COMMON_STATUS_CODES_SET.has(code as number);
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
  const [prevConfig, setPrevConfig] = useState(endpoint.mockConfig);

  // 참고: endpoint.mockConfig 객체 참조 비교(===)를 통해 부모로부터의 최신 데이터를 폼에 동기화합니다.
  // 부모에서 동일한 값으로 매 렌더링마다 새 객체를 생성해 넘기지 않도록 주의해야 불필요한 상태 초기화를 막을 수 있습니다.
  if (endpoint.mockConfig !== prevConfig) {
    setPrevConfig(endpoint.mockConfig);
    const serviceId = findInitialServiceId(endpoint.mockConfig);
    setSelectedServiceId(serviceId);
    setSelectedScenarioId(findInitialScenarioId(endpoint.mockConfig, serviceId));
    const code = endpoint.mockConfig?.statusCode || 200;
    setStatusCode(code);
    setIsCustomStatus(!COMMON_STATUS_CODES_SET.has(code as number));
    setDelayMs(endpoint.mockConfig?.delayMs || 0);
    setBody(endpoint.mockConfig?.body || 'ok');
    
    const headers = endpoint.mockConfig?.headers || {};
    setHeaderList(Object.entries(headers).map(([k, v]) => ({
      id: generateId(),
      key: k,
      value: String(v),
    })));
  }

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

  const currentScenario = currentService?.scenarios.find((s) => s.id === selectedScenarioId);
  const isDynamic = currentScenario?.isDynamic ?? false;

  const resetToCustom = () => {
    setSelectedServiceId(CUSTOM_SERVICE_ID);
    setSelectedScenarioId(null);
  };

  const applyScenario = (scenario: PresetScenario) => {
    setSelectedScenarioId(scenario.id);
    setStatusCode(scenario.statusCode);
    setIsCustomStatus(!COMMON_STATUS_CODES_SET.has(scenario.statusCode));
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
      presetType: currentScenario?.presetType ?? null,
    }, {
      onSuccess: () => {
        setIsSaved(true);
        addToast('모의 설정을 저장했어요.', 3000);
        if (savedResetTimerRef.current !== null) {
          window.clearTimeout(savedResetTimerRef.current);
        }
        savedResetTimerRef.current = window.setTimeout(() => {
          setIsSaved(false);
          savedResetTimerRef.current = null;
        }, 2000);
      }
    });
  };

  return {
    state: {
      selectedServiceId,
      selectedScenarioId,
      statusCode,
      isCustomStatus,
      delayMs,
      body,
      headerList,
      headerWarning,
      isSaved,
      isPending,
      currentService,
      scenarioOptions,
      currentScenario,
      isDynamic,
    },
    actions: {
      setSelectedServiceId,
      setSelectedScenarioId,
      setStatusCode,
      setIsCustomStatus,
      setDelayMs,
      setBody,
      setHeaderList,
      resetToCustom,
      applyScenario,
      handleApply,
    }
  };
}
