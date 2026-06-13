import { useMemo } from 'react';
import styles from './JsonViewer.module.css';

function JsonViewer({ data }: { data: unknown }) {
  const content = useMemo(() => {
    if (data === undefined || data === null) return '';
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  }, [data]);

  if (data === undefined || data === null) {
    return (
      <div className={styles.container}>
        <span className={styles.empty}>null</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <pre className={styles.pre}>
        <code className={styles.code}>{content}</code>
      </pre>
    </div>
  );
}

export default JsonViewer;
