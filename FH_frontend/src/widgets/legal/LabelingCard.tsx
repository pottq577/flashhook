import React from 'react';
import styles from './legal.module.css';

export const LabelingCard: React.FC = () => {
  return (
    <div className={styles.highlightBox} style={{ borderLeftColor: '#10b981', display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ fontSize: '2rem' }}>🔒</div>
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#f9fafb', fontSize: '1rem' }}>데이터 보안 약속</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#d1d5db' }}>
          FlashHook에 수신된 모든 로그 데이터는 암호화되어 전송되며, 생성 후 <strong>24시간이 지나면 서버에서 완전히 파기</strong>됩니다.
        </p>
      </div>
    </div>
  );
};
