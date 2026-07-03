import { logger } from "./logger";

export function installGlobalErrorHandlers() {
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled Promise Rejection", event.reason);
    // You can also report to Sentry/DataDog here
  });

  window.addEventListener("error", (event) => {
    // Ignore benign cross-origin script errors
    if (event.message === "Script error." && !event.filename) return;
    logger.error("Global Window Error", event.error ?? event.message, event.filename);
  });
}
