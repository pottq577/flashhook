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
    return <div className={styles.emptyContainer}>상세 정보 로딩 중…</div>;
  }

  if (!log) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>상세 정보를 볼 요청을 선택하세요</div>
      </div>
    );
  }

  const date = new Date(log.receivedAt);
  const isValidDate = !isNaN(date.getTime());
  const dateString = isValidDate ? date.toLocaleString() : '잘못된 날짜';

  return (
    <div className={styles.container} data-testid="log-detail">
      <div className={styles.header}>
        <MethodBadge method={log.method} />
        <span className={styles.url}>{log.url}</span>
      </div>

      <div className={styles.metaInfo}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>수신 일시</span>
          <span>{dateString}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>클라이언트 IP</span>
          <span>{log.clientIp}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>콘텐츠 타입</span>
          <span>{log.contentType || '없음'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>크기</span>
          <span>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>헤더 (Headers)</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.headers || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.headers || Object.keys(log.headers).length === 0) && <div role="status" className={styles.empty}>헤더 없음</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>쿼리 파라미터 (Query Parameters)</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.queryParams || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.queryParams || Object.keys(log.queryParams).length === 0) && <div role="status" className={styles.empty}>쿼리 파라미터 없음</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>본문 (Body)</h3>
        <JsonViewer data={log.body} />
      </div>
    </div>
  );
}

export default LogDetail;
