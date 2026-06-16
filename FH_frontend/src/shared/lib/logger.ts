export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === "development") {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === "development") {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, error?: unknown, ...args: unknown[]) => {
    if (import.meta.env.MODE === "development") {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      // 보안 및 성능 최적화: 프로덕션 환경에서는 민감 정보(PII) 유출 방지를 위해 명시된 error 객체까지만 로깅하고 추가 인자(...args)는 제한함
      console.error(`[ERROR] ${message}`, error);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === "development") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
