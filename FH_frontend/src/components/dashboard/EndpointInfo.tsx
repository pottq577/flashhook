import type { Endpoint } from '../../types/endpoint';
import CopyButton from '../common/CopyButton';

function EndpointInfo({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div style={styles.container}>
      <div style={styles.infoGroup}>
        <div style={styles.label}>Your Webhook URL</div>
        <div style={styles.valueRow}>
          <code style={styles.code}>{endpoint.webhookUrl}</code>
          <CopyButton text={endpoint.webhookUrl} />
        </div>
      </div>
      
      <div style={styles.statsGroup}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Max Logs:</span>
          <span style={styles.statValue}>{endpoint.limits?.maxLogs || 500}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Max Size:</span>
          <span style={styles.statValue}>{endpoint.limits?.maxSizeMb || 5}MB</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Expires:</span>
          <span style={styles.statValue}>{new Date(endpoint.expiresAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  infoGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  code: {
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent)',
    fontSize: '1rem',
    border: '1px solid var(--border)',
  },
  statsGroup: {
    display: 'flex',
    gap: '1.5rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  }
};

export default EndpointInfo;
