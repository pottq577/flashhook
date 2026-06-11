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
        alert('✅ 성공: Rate Limit이 해제되었습니다. 이제 엔드포인트를 다시 생성할 수 있습니다.');
      } else {
        alert('❌ 실패: Rate Limit 해제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ 에러: 서버와 통신할 수 없습니다.');
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
