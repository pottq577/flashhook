import { useState, useEffect } from 'react';
import type { Endpoint } from '../types/endpoint';
import { getEndpoint } from '../api/endpoints';
import * as tokenStorage from '../utils/tokenStorage';

interface UseEndpointReturn {
  endpoint: Endpoint | null;
  loading: boolean;
  error: string | null;
}

export function useEndpoint(endpointId: string): UseEndpointReturn {
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URL에서 토큰 추출 → sessionStorage 저장 → URL 정리
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      tokenStorage.set(endpointId, token);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // TODO: 엔드포인트 데이터 fetch
    setLoading(true);
    getEndpoint(endpointId)
      .then(setEndpoint)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpointId]);

  return { endpoint, loading, error };
}
