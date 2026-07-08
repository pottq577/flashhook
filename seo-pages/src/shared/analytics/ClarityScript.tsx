"use client";

import { useEffect } from "react";
import Script from "next/script";

export function ClarityScript({ clarityId }: { clarityId: string | undefined }) {
  const isValid = clarityId && /^[a-zA-Z0-9]+$/.test(clarityId);

  useEffect(() => {
    if (!isValid) {
      console.warn(
        "[ClarityScript] NEXT_PUBLIC_CLARITY_PROJECT_ID is missing or invalid. Skipping initialization."
      );
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[ClarityScript] Clarity initialized", { projectId: clarityId });
    }
  }, [clarityId, isValid]);

  if (!isValid) return null;

  return (
    <Script id="clarity-script" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `}
    </Script>
  );
}
