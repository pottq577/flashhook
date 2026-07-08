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
      // 바닐라 JS 스니펫과 동일하게 arguments 객체를 푸시하도록 수정
      const scriptContent = `
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];
            if(y && y.parentNode) { y.parentNode.insertBefore(t,y); }
            else { l.head.appendChild(t); }
        })(window, document, "clarity", "script", "${projectId}");
      `;
      
      const inlineScript = document.createElement("script");
      inlineScript.type = "text/javascript";
      inlineScript.innerHTML = scriptContent;
      document.head.appendChild(inlineScript);

      if (import.meta.env.MODE !== "production") {
        console.debug("[ClarityAnalytics] Clarity initialized", { projectId });
      }
    } catch (e) {
      console.error("[ClarityAnalytics] Failed to initialize Clarity Analytics", e);
    }
  }, []);

  return null;
}
