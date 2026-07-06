import React, { useEffect, useRef, useState } from "react";
import { logger } from "@/shared/lib/logger";
import styles from "@/shared/ui/AdBanner/AdBanner.module.css";

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
  variant?: "compact" | "panel" | "horizontal";
}

const isAdsEnabled = import.meta.env.VITE_ENABLE_ADS === "true";

export const AdBanner: React.FC<AdBannerProps> = ({
  dataAdClient = "ca-pub-4820146019835499",
  dataAdSlot = "1234567890",
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
  variant = "panel",
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const isPushed = useRef(false);
  const [isAdError, setIsAdError] = useState(false);

  useEffect(() => {
    // 애드센스 심사 중이거나 환경변수가 켜져있지 않으면 스크립트 초기화 건너뜀
    if (!isAdsEnabled) return;

    // Only push if not already pushed and adsbygoogle is available
    if (adRef.current && !isPushed.current) {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isPushed.current = true;
      } catch (error) {
        logger.error("AdSense error", error);
        // 애드센스 스크립트 에러 발생 시 UI Fallback 처리를 위한 상태 업데이트
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAdError(true);
      }
    }

    // AdBlock 또는 응답 없음(unfilled) 감지 폴백 (4초 후 확인)
    const timeoutId = setTimeout(() => {
      if (adRef.current) {
        const status = adRef.current.getAttribute("data-ad-status");
        
        // 1. 애드센스에서 명시적으로 빈 광고(unfilled)로 처리한 경우
        // 2. 스크립트 차단(AdBlock)으로 인해 아예 status 속성이 부여되지 않은 경우
        if (!status || status === "unfilled") {
          setIsAdError(true);
        }
      }
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, []);

  if (!isAdsEnabled) {
    return null;
  }

  return (
    <div className={`${styles.adContainer} ${styles[variant]}`}>
      {isAdError && <div className={styles.placeholder}>SPONSORED</div>}
      <ins
        ref={adRef}
        className={`adsbygoogle ${styles.ins}`}
        data-ad-client={dataAdClient}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
};
