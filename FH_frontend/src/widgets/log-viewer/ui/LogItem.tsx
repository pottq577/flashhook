import type { WebhookLog } from '@/entities/log/model/log.schema';
import MethodBadge from '@/shared/ui/MethodBadge';
import styles from './LogItem.module.css';
import { memo } from 'react';

interface LogItemProps {
  log: WebhookLog & { _timeString?: string; _contentType?: string };
  isSelected: boolean;
  onClick: () => void;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const LogItem = memo(({ log, isSelected, onClick }: LogItemProps) => {
  const timeString = log._timeString ?? (() => {
    const d = new Date(log.receivedAt);
    return !isNaN(d.getTime()) ? timeFormatter.format(d) : 'Invalid time';
  })();
  const contentType = log._contentType ?? (log.contentType ? log.contentType.split(';')[0] : '');

  return (
    <div 
      role="button"
      tabIndex={0}
      data-testid="log-item"
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
        {contentType && <span className={styles.contentType}>{contentType}</span>}
        <span className={styles.size}>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  );
});

export default LogItem;
