import { useEffect } from "react";

interface ClarityFunction {
  (...args: unknown[]): void;
  q?: unknown[][];
}

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    
    if (!projectId) {
      console.warn("[ClarityAnalytics] VITE_CLARITY_PROJECT_ID is missing. Skipping initialization.");
      return;
    }

    const windowRecord = window as unknown as Record<string, ClarityFunction>;
    
    // StrictMode 중복 주입 방지
    if (windowRecord.clarity || document.querySelector(`script[src*="clarity.ms/tag/${projectId}"]`)) {
      return;
    }

    try {
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

      if (import.meta.env.MODE !== "production") {
        console.debug("[ClarityAnalytics] Clarity initialized", { projectId });
      }
    } catch (e) {
      console.error("[ClarityAnalytics] Failed to initialize Clarity Analytics", e);
    }
  }, []);

  return null;
}
