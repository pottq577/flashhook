import type { Endpoint } from '@/entities/endpoint/model/endpoint.schema';
import CopyButton from '@/shared/ui/CopyButton';
import CountdownTimer from './CountdownTimer';
import styles from './EndpointInfo.module.css';

function EndpointInfo({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className={styles.container}>
      <div className={styles.infoGroup}>
        <h1 className={styles.label}>웹훅 URL</h1>
        <div className={styles.valueRow}>
          <code className={styles.code} data-testid="webhook-url">{endpoint.webhookUrl}</code>
          <CopyButton text={endpoint.webhookUrl} />
        </div>
      </div>
      
      <div className={styles.statsGroup}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>최대 로그:</span>
          <span className={styles.statValue}>{endpoint.limits?.maxLogs || 500}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>최대 용량:</span>
          <span className={styles.statValue}>{endpoint.limits?.maxSizeMb || 5}MB</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>만료 일시:</span>
          <span className={styles.statValue}>
            {new Date(endpoint.expiresAt).toLocaleString()} (<CountdownTimer expiresAt={endpoint.expiresAt} />)
          </span>
        </div>
      </div>
    </div>
  );
}

export default EndpointInfo;
