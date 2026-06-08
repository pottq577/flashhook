import { useLogDetailQuery } from '../../../entities/log/api/log.queries';
import MethodBadge from '../../../shared/ui/MethodBadge';
import JsonViewer from './JsonViewer';
import styles from './LogDetail.module.css';

interface LogDetailProps {
  logId?: string;
  endpointId?: string;
}

function LogDetail({ logId, endpointId }: LogDetailProps) {
  const { data: log, isLoading } = useLogDetailQuery(endpointId || '', logId);

  if (isLoading) {
    return <div className={styles.emptyContainer}>Loading detail...</div>;
  }

  if (!log) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>Select a request to view details</div>
      </div>
    );
  }

  const date = new Date(log.receivedAt);
  const isValidDate = !isNaN(date.getTime());
  const dateString = isValidDate ? date.toLocaleString() : 'Invalid date';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MethodBadge method={log.method} />
        <span className={styles.url}>{log.url}</span>
      </div>

      <div className={styles.metaInfo}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Received At</span>
          <span>{dateString}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Client IP</span>
          <span>{log.clientIp}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Content Type</span>
          <span>{log.contentType || 'None'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Size</span>
          <span>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Headers</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.headers || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.headers || Object.keys(log.headers).length === 0) && <span className={styles.empty}>No headers</span>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Query Parameters</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.queryParams || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.queryParams || Object.keys(log.queryParams).length === 0) && <span className={styles.empty}>No query parameters</span>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Body</h3>
        <JsonViewer data={log.body} />
      </div>
    </div>
  );
}

export default LogDetail;
