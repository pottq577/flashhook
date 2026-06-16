import React, { useEffect, useRef } from "react";
import styles from "./AdBanner.module.css";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdBannerProps {
  dataAdClient?: string;
  dataAdSlot?: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  dataAdClient = "ca-pub-XXXXXXXXX",
  dataAdSlot = "1234567890",
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
}) => {
  const adRef = useRef<HTMLInsElement>(null);
  const isPushed = useRef(false);

  useEffect(() => {
    // 애드센스 심사 중이거나 환경변수가 켜져있지 않으면 스크립트 초기화 건너뜀
    if (import.meta.env.VITE_ENABLE_ADS !== 'true') return;

    // Only push if not already pushed and adsbygoogle is available
    if (adRef.current && !isPushed.current) {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isPushed.current = true;
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }
  }, []);

  if (import.meta.env.VITE_ENABLE_ADS !== 'true') {
    return null;
  }

  return (
    <div className={styles.adContainer}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={dataAdClient}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
};
