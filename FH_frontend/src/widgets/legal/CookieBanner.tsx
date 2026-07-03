import React, { useState, useSyncExternalStore } from "react";
import styles from "./legal.module.css";

const emptySubscribe = () => () => {};

export const CookieBanner: React.FC = () => {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    localStorage.setItem("flashhook_storage_consent", "true");
    setIsAccepted(true);
  };

  if (!isMounted) return null;

  const hasConsent = localStorage.getItem("flashhook_storage_consent") === "true";
  if (hasConsent || isAccepted) return null;

  return (
    <div className={styles.banner} role="region" aria-label="저장소 사용 안내">
      <div className={styles.bannerText}>
        <span>세션 토큰만 임시 저장해요 · <a href="/privacy" className={styles.link}>[자세히]</a></span>
      </div>
      <button onClick={handleAccept} className={styles.button}>
        확인
      </button>
    </div>
  );
};
