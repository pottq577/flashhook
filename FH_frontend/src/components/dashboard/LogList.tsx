import { WebhookLog } from '../../types/log';
import LogItem from './LogItem';

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
}

function LogList({ logs, selectedLogId, onSelect }: LogListProps) {
  if (!logs || logs.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No webhooks received yet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Send a request to your unique URL to see it here.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {logs.map((log) => (
        <LogItem 
          key={log.logId} 
          log={log} 
          isSelected={selectedLogId === log.logId} 
          onClick={() => onSelect(log.logId)} 
        />
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
  }
};

export default LogList;
