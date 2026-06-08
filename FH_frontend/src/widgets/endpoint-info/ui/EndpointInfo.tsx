import type { Endpoint } from '../../../entities/endpoint/model/endpoint.schema';
import CopyButton from '../../../shared/ui/CopyButton';
import styles from './EndpointInfo.module.css';

function EndpointInfo({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className={styles.container}>
      <div className={styles.infoGroup}>
        <div className={styles.label}>Your Webhook URL</div>
        <div className={styles.valueRow}>
          <code className={styles.code} data-testid="webhook-url">{endpoint.webhookUrl}</code>
          <CopyButton text={endpoint.webhookUrl} />
        </div>
      </div>
      
      <div className={styles.statsGroup}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Max Logs:</span>
          <span className={styles.statValue}>{endpoint.limits?.maxLogs || 500}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Max Size:</span>
          <span className={styles.statValue}>{endpoint.limits?.maxSizeMb || 5}MB</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Expires:</span>
          <span className={styles.statValue}>{new Date(endpoint.expiresAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default EndpointInfo;
