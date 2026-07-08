import { useEffect } from "react";
import { logger } from "@/shared/lib/logger";

interface ClarityFunction {
  (...args: unknown[]): void;
  q?: unknown[][];
}

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    
    if (!projectId) {
      return;
    }

    try {
      const windowRecord = window as unknown as Record<string, ClarityFunction>;
      
      windowRecord.clarity = windowRecord.clarity || function (...args: unknown[]) {
        if (!windowRecord.clarity.q) {
          windowRecord.clarity.q = [];
        }
        windowRecord.clarity.q.push(args);
      };

      const scriptElement = document.createElement("script");
      scriptElement.async = true;
      scriptElement.src = `https://www.clarity.ms/tag/${projectId}`;
      
      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(scriptElement, firstScript);
      } else {
        document.head.appendChild(scriptElement);
      }
    } catch (e) {
      logger.error("Failed to initialize Clarity Analytics", e);
    }
  }, []);

  return null;
}
