import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return <div role="status" className={styles.emptyContainer}>&gt; LOADING_PAYLOAD…</div>;
  }

  if (!log) {
    if (!endpointId) {
      return (
        <div role="status" className={styles.emptyContainer}>
          <div className={styles.emptyText}>
            <div className={styles.emptyTitle}>&gt; WAITING_FOR_ENDPOINT…</div>
            <p className={styles.emptyDesc}>엔드포인트를 먼저 만들거나 선택해주세요.</p>
          </div>
        </div>
      );
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://flashhook.kr/api').replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/hooks/${endpointId}`;
    const curlCommand = `curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Hello from FlashHook!"}'`;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(curlCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    };

    return (
      <div role="status" className={styles.emptyContainer}>
        <div className={styles.emptyText}>
          <div className={styles.emptyTitle}>&gt; WAITING_FOR_REQUEST…</div>
          <p className={styles.emptyDesc}>아직 들어온 요청이 없어요. 아래 명령어로 테스트 웹훅을 보내보세요.</p>
          <div className={styles.curlBlock}>
            <div className={styles.curlHeader}>
              <div className={styles.macControls} aria-hidden="true">
                <span className={styles.macDot} style={{ backgroundColor: '#ff5f56' }} />
                <span className={styles.macDot} style={{ backgroundColor: '#ffbd2e' }} />
                <span className={styles.macDot} style={{ backgroundColor: '#27c93f' }} />
              </div>
              <span className={styles.curlLabel}>bash</span>
              <button className={styles.copyButton} onClick={handleCopy} title="Copy to clipboard" aria-label="Copy to clipboard">
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <div className={styles.curlCodeWrapper}>
              <code>{curlCommand}</code>
            </div>
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
