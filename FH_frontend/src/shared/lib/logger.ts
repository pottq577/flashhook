export const logger = {
  info: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, error?: unknown, ...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
