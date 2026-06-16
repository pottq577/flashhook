import { logger } from '@/shared/lib/logger';
import styles from './JsonViewer.module.css';

function JsonViewer({ data }: { data: unknown }) {
  let content = '';
  if (data !== undefined && data !== null) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        content = JSON.stringify(parsed, null, 2);
      } catch (e) {
        logger.warn('Failed to parse string data as JSON in JsonViewer', { error: e, data: (data as string).slice(0, 100) });
        content = data;
      }
    } else {
      content = JSON.stringify(data, null, 2);
    }
  }

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
