import React, { useState } from "react";
import styles from "./legal.module.css";

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("flashhook_storage_consent");
    }
    return true;
  });

  const handleAccept = () => {
    localStorage.setItem("flashhook_storage_consent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="저장소 사용 안내">
      <div className={styles.bannerText}>
        <strong>저장소 이용 안내:</strong> FlashHook은 쿠키를 사용하지 않지만,
        서비스 이용(Endpoint 접근 유지)을 위해 필수적인 액세스 토큰을 브라우저의
        SessionStorage에 임시 저장해요. 서비스를 계속 이용하면 이에 동의한
        것으로 생각할게요.
      </div>
      <button onClick={handleAccept} className={styles.button}>
        확인
      </button>
    </div>
  );
};
