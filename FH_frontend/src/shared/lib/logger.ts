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
    console.error(`[ERROR] ${message}`, error, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
