import { logger } from "@/shared/lib/logger";

export function get(): string | null {
  // 토큰은 HttpOnly 쿠키로 관리되므로 더 이상 프론트엔드 코드에서 접근할 수 없습니다.
  return "managed_by_cookie";
}

export function set(endpointId: string): void {
  const historyRaw = localStorage.getItem("fh_history") || "[]";
  try {
    const parsed = JSON.parse(historyRaw);
    const history: string[] = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
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
  const historyRaw = localStorage.getItem("fh_history") || "[]";
  try {
    const parsed = JSON.parse(historyRaw);
    const history: string[] = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
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
