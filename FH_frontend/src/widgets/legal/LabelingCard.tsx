import React from 'react';
import styles from './legal.module.css';

export const LabelingCard = () => {
  return (
    <div className={`${styles.highlightBox} ${styles.securityCard}`}>
      <div className={styles.securityIcon} aria-hidden="true">🔒</div>
      <div>
        <h3 className={styles.securityTitle}>데이터 보안 약속</h3>
        <p className={styles.securityText}>
          FlashHook에 수신된 모든 로그 데이터는 암호화되어 전송되며, 생성 후 <strong>24시간이 지나면 서버에서 완전히 파기</strong>됩니다.
        </p>
      </div>
    </div>
  );
};
