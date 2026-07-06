import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "@/fonts";
import "@/index.css";
import App from "@/app/App.tsx";
import { ErrorBoundary } from "@/app/ErrorBoundary.tsx";
import { installGlobalErrorHandlers } from "@/shared/lib/global-error-handlers.ts";

installGlobalErrorHandlers();

if (typeof window !== "undefined") {
  const loadAdSense = () => {
    if (document.getElementById("adsense-script")) return;
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4820146019835499";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  };

  const initAdSense = () => {
    loadAdSense();
    window.removeEventListener("mousemove", initAdSense);
    window.removeEventListener("scroll", initAdSense);
    window.removeEventListener("touchstart", initAdSense);
    window.removeEventListener("keydown", initAdSense);
  };

  window.addEventListener("mousemove", initAdSense, {
    once: true,
    passive: true,
  });
  window.addEventListener("scroll", initAdSense, { once: true, passive: true });
  window.addEventListener("touchstart", initAdSense, {
    once: true,
    passive: true,
  });
  window.addEventListener("keydown", initAdSense, {
    once: true,
    passive: true,
  });
}

import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>,
);
