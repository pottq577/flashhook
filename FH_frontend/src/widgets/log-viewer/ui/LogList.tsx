import type { WebhookLog } from '../../../entities/log/model/log.schema';
import LogItem from './LogItem';
import styles from './LogList.module.css';

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
  endpointId?: string;
}

function LogList({ logs, selectedLogId, onSelect }: LogListProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No webhooks received yet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Send a request to your unique URL to see it here.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

export default LogList;
