import { useLogDetailQuery } from '@/entities/log/api/log.queries';
import MethodBadge from '@/shared/ui/MethodBadge';
import JsonViewer from './JsonViewer';
import styles from './LogDetail.module.css';

interface LogDetailProps {
  logId?: string;
  endpointId?: string;
}

function LogDetail({ logId, endpointId }: LogDetailProps) {
  const { data: log, isLoading } = useLogDetailQuery(endpointId || '', logId);

  if (isLoading) {
    return <div role="status" className={styles.emptyContainer}>&gt; LOADING_PAYLOAD...</div>;
  }

  if (!log) {
    const webhookUrl = `https://flashhook.dev/api/e/${endpointId}`;
    return (
      <div role="status" className={styles.emptyContainer}>
        <div className={styles.emptyText}>
          <div className={styles.emptyTitle}>&gt; WAITING_FOR_REQUEST...</div>
          <p className={styles.emptyDesc}>요청 목록이 비어있습니다. 아래 명령어로 테스트 웹훅을 발송해 보세요.</p>
          <div className={styles.curlBlock}>
            <code>
              curl -X POST {webhookUrl} \<br/>
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
              &nbsp;&nbsp;-d '{`{"message": "Hello from FlashHook!"}`}'
            </code>
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(log.receivedAt);
  const isValidDate = !isNaN(date.getTime());
  const dateString = isValidDate ? date.toLocaleString() : 'INVALID_DATE';

  return (
    <div className={styles.container} data-testid="log-detail">
      <div className={styles.header}>
        <MethodBadge method={log.method} />
        <span className={styles.url}>{log.url}</span>
      </div>

      <div className={styles.metaInfo}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>TIMESTAMP</span>
          <span>{dateString}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>CLIENT_IP</span>
          <span>{log.clientIp}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>CONTENT_TYPE</span>
          <span>{log.contentType || 'NONE'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>PAYLOAD_SIZE</span>
          <span>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ HEADERS ]</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.headers || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.headers || Object.keys(log.headers).length === 0) && <div role="status" className={styles.empty}>NO_HEADERS</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ QUERY_PARAMETERS ]</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.queryParams || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.queryParams || Object.keys(log.queryParams).length === 0) && <div role="status" className={styles.empty}>NO_QUERY_PARAMS</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ BODY ]</h3>
        <JsonViewer data={log.body} />
      </div>
    </div>
  );
}

export default LogDetail;
