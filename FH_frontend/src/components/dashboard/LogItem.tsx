import type { WebhookLog } from '../../types/log';
import MethodBadge from '../common/MethodBadge';

interface LogItemProps {
  log: WebhookLog;
  isSelected: boolean;
  onClick: () => void;
}

function LogItem({ log, isSelected, onClick }: LogItemProps) {
  const date = new Date(log.receivedAt);
  const timeString = !isNaN(date.getTime())
    ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : 'Invalid time';

  return (
    <div 
      style={{
        ...styles.container,
        ...(isSelected ? styles.selected : {})
      }}
      onClick={onClick}
    >
      <div style={styles.header}>
        <MethodBadge method={log.method} />
        <span style={styles.time}>{timeString}</span>
      </div>
      <div style={styles.preview}>
        {log.contentType && <span style={styles.contentType}>{log.contentType.split(';')[0]}</span>}
        <span style={styles.size}>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  selected: {
    backgroundColor: 'var(--bg-tertiary)',
    borderLeft: '3px solid var(--accent)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  time: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  preview: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  contentType: {
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    maxWidth: '60%',
  },
  size: {
    color: 'var(--text-muted)',
  }
};

export default LogItem;
