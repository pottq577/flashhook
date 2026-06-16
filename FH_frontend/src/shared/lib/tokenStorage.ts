import { logger } from "@/shared/lib/logger";

const KEY_PREFIX = "fh_token_";

function buildKey(endpointId: string): string {
  return `${KEY_PREFIX}${endpointId}`;
}

export function get(endpointId: string): string | null {
  return sessionStorage.getItem(buildKey(endpointId));
}

export function set(endpointId: string, token: string): void {
  sessionStorage.setItem(buildKey(endpointId), token);

  const historyRaw = localStorage.getItem("fh_history") || "[]";
  try {
    const parsed = JSON.parse(historyRaw);
    const history = Array.isArray(parsed) ? parsed : [];
    if (!history.includes(endpointId)) {
      history.push(endpointId);
      localStorage.setItem("fh_history", JSON.stringify(history));
    }
  } catch (e) {
    logger.warn(
      "Failed to parse fh_history from localStorage, resetting data",
      e,
    );
    localStorage.setItem("fh_history", JSON.stringify([endpointId]));
  }
}

export function remove(endpointId: string): void {
  sessionStorage.removeItem(buildKey(endpointId));

  const historyRaw = localStorage.getItem("fh_history") || "[]";
  try {
    const parsed = JSON.parse(historyRaw);
    const history = Array.isArray(parsed) ? parsed : [];
    const newHistory = history.filter((id: string) => id !== endpointId);
    localStorage.setItem("fh_history", JSON.stringify(newHistory));
  } catch (e) {
    logger.warn(
      "Failed to parse fh_history from localStorage, clearing data",
      e,
    );
    localStorage.setItem("fh_history", "[]");
  }
}
