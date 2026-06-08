import type { WebhookLogDetail } from '../../types/log';
import MethodBadge from '../common/MethodBadge';
import JsonViewer from './JsonViewer';

interface LogDetailProps {
  log: WebhookLogDetail | null;
}

function LogDetail({ log }: LogDetailProps) {
  if (!log) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyText}>Select a request to view details</div>
      </div>
    );
  }

  const date = new Date(log.receivedAt);
  const isValidDate = !isNaN(date.getTime());
  const dateString = isValidDate ? date.toLocaleString() : 'Invalid date';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <MethodBadge method={log.method} />
        <span style={styles.url}>{log.url}</span>
      </div>

      <div style={styles.metaInfo}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Received At</span>
          <span>{dateString}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Client IP</span>
          <span>{log.clientIp}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Content Type</span>
          <span>{log.contentType || 'None'}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Size</span>
          <span>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Headers</h3>
        <div style={styles.keyValueMap}>
          {Object.entries(log.headers || {}).map(([key, value]) => (
            <div key={key} style={styles.keyValueRow}>
              <span style={styles.key}>{key}:</span>
              <span style={styles.value}>{value}</span>
            </div>
          ))}
          {(!log.headers || Object.keys(log.headers).length === 0) && <span style={styles.empty}>No headers</span>}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Query Parameters</h3>
        <div style={styles.keyValueMap}>
          {Object.entries(log.queryParams || {}).map(([key, value]) => (
            <div key={key} style={styles.keyValueRow}>
              <span style={styles.key}>{key}:</span>
              <span style={styles.value}>{value}</span>
            </div>
          ))}
          {(!log.queryParams || Object.keys(log.queryParams).length === 0) && <span style={styles.empty}>No query parameters</span>}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Body</h3>
        <JsonViewer data={log.body} />
      </div>
    </div>
  );
}

const styles = {
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
  },
  emptyText: {
    fontSize: '1.2rem',
  },
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  url: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    wordBreak: 'break-all' as const,
  },
  metaInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  metaLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '0.5rem',
    margin: 0,
  },
  keyValueMap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  keyValueRow: {
    display: 'flex',
    gap: '1rem',
  },
  key: {
    color: 'var(--accent)',
    minWidth: '200px',
  },
  value: {
    color: 'var(--text-primary)',
    wordBreak: 'break-all' as const,
  },
  empty: {
    color: 'var(--text-muted)',
    fontStyle: 'italic' as const,
  }
};

export default LogDetail;
