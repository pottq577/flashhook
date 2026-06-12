export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === 'development') {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === 'development') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, error?: unknown, ...args: unknown[]) => {
    if (import.meta.env.MODE === 'development') {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      // 프로덕션에서도 에러 객체는 유지하되, 추가 인자만 제한
      console.error(`[ERROR] ${message}`, error);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
