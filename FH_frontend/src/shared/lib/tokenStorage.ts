const KEY_PREFIX = 'fh_token_';

function buildKey(endpointId: string): string {
  return `${KEY_PREFIX}${endpointId}`;
}

export function get(endpointId: string): string | null {
  return localStorage.getItem(buildKey(endpointId)) || sessionStorage.getItem(buildKey(endpointId));
}

export function set(endpointId: string, token: string): void {
  sessionStorage.setItem(buildKey(endpointId), token);
  localStorage.setItem(buildKey(endpointId), token);
  
  const historyRaw = localStorage.getItem('fh_history') || '[]';
  try {
    const history = JSON.parse(historyRaw);
    if (!history.includes(endpointId)) {
       history.push(endpointId);
       localStorage.setItem('fh_history', JSON.stringify(history));
    }
  } catch {
    // ignore parse error
  }
}

export function remove(endpointId: string): void {
  sessionStorage.removeItem(buildKey(endpointId));
  localStorage.removeItem(buildKey(endpointId));
  
  const historyRaw = localStorage.getItem('fh_history') || '[]';
  try {
    const history = JSON.parse(historyRaw);
    const newHistory = history.filter((id: string) => id !== endpointId);
    localStorage.setItem('fh_history', JSON.stringify(newHistory));
  } catch {
    // ignore parse error
  }
}
