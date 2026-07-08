import { useEffect } from "react";
import { logger } from "@/shared/lib/logger";

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    
    if (!projectId) {
      return;
    }

    try {
      // Microsoft Clarity script snippet
      (function(c,l,a,r,i,t,y){
          // @ts-expect-error Clarity script injection
          c[a]=c[a]||function(...args: unknown[]){(c[a].q=c[a].q||[]).push(args)};
          t=l.createElement(r) as HTMLScriptElement;
          t.async=1;
          t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];
          y.parentNode?.insertBefore(t,y);
      })(window, document, "clarity", "script", projectId);
    } catch (e) {
      logger.error("Failed to initialize Clarity Analytics", e);
    }
  }, []);

  return null;
}
