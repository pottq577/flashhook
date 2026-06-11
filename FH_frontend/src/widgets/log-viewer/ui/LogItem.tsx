import type { WebhookLog } from '@/entities/log/model/log.schema';
import MethodBadge from '@/shared/ui/MethodBadge';
import styles from './LogItem.module.css';

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
      role="button"
      tabIndex={0}
      className={`${styles.container} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.header}>
        <MethodBadge method={log.method} />
        <span className={styles.time}>{timeString}</span>
      </div>
      <div className={styles.preview}>
        {log.contentType && <span className={styles.contentType}>{log.contentType.split(';')[0]}</span>}
        <span className={styles.size}>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  );
}

export default LogItem;
