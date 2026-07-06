import type { Endpoint } from "@/entities/endpoint";
import CopyButton from "@/shared/ui/CopyButton";
import CountdownTimer from "@/widgets/endpoint-info/ui/CountdownTimer";
import styles from "@/widgets/endpoint-info/ui/EndpointInfo.module.css";
import { formatExpiresAt } from "@/shared/lib/formatDate";

function EndpointInfo({ endpoint }: { endpoint: Endpoint }) {
  const formattedDate = formatExpiresAt(endpoint.expiresAt);

  return (
    <div className={styles.container}>
      <div className={styles.infoGroup}>
        <div className={styles.labelRow}>
          <span className={styles.label}>웹훅 URL</span>
          <CopyButton text={endpoint.webhookUrl} />
        </div>
        <div className={styles.valueRow}>
          <code className={styles.code} data-testid="webhook-url">
            {endpoint.webhookUrl}
          </code>
        </div>
      </div>

      <div className={styles.statsGroup}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>최대 로그:</span>
          <span className={styles.statValue}>
            {endpoint.limits?.maxLogs || 500}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>최대 용량:</span>
          <span className={styles.statValue}>
            {endpoint.limits?.maxSizeMb || 5}MB
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>만료 일시:</span>
          <span className={styles.statValue}>
            {formattedDate}
            <br />
            (<CountdownTimer expiresAt={endpoint.expiresAt} />)
          </span>
        </div>
      </div>
    </div>
  );
}

export default EndpointInfo;
