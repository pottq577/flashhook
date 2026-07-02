import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "./index.css";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/ErrorBoundary.tsx";

if (typeof window !== "undefined") {
  const loadAdSense = () => {
    if (document.getElementById("adsense-script")) return;
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXX";
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
