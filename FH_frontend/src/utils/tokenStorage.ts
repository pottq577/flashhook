const KEY_PREFIX = 'fh_token_';

function buildKey(endpointId: string): string {
  return `${KEY_PREFIX}${endpointId}`;
}

export function get(endpointId: string): string | null {
  return sessionStorage.getItem(buildKey(endpointId));
}

export function set(endpointId: string, token: string): void {
  sessionStorage.setItem(buildKey(endpointId), token);
}

export function remove(endpointId: string): void {
  sessionStorage.removeItem(buildKey(endpointId));
}
