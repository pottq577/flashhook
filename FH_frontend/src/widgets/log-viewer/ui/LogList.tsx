import type { WebhookLog } from '@/entities/log/model/log.schema';
import { Virtuoso } from 'react-virtuoso';
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
      <div role="status" className={styles.empty}>
        <p>아직 들어온 웹훅이 없어요.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>위의 웹훅 URL로 요청을 보내면 이곳에서 실시간으로 확인할 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Virtuoso
        style={{ height: '100%' }}
        data={logs}
        computeItemKey={(_, log) => log.logId}
        itemContent={(_index, log) => (
          <div style={{ paddingBottom: '0.5rem' }}>
            <LogItem 
              log={log} 
              isSelected={selectedLogId === log.logId} 
              onClick={() => onSelect(log.logId)} 
            />
          </div>
        )}
      />
    </div>
  );
}

export default LogList;
