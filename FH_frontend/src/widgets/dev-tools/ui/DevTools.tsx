import { useState } from 'react';
import styles from './DevTools.module.css';

export function DevTools() {
  const [isLoading, setIsLoading] = useState(false);

  // 프로덕션 환경에서는 렌더링하지 않음
  if (!import.meta.env.DEV) return null;

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/dev/rate-limit/reset`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('✅ 생성 제한을 풀었어요. 이제 다시 엔드포인트를 만들 수 있어요.');
      } else {
        alert('❌ 제한을 풀지 못했어요. 잠시 후 다시 시도해주세요.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ 서버와 연결할 수 없어요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button onClick={handleReset} disabled={isLoading} className={styles.button}>
        {isLoading ? '[ RESETTING... ]' : '[ DEV: RESET RATE LIMIT ]'}
      </button>
    </div>
  );
}
