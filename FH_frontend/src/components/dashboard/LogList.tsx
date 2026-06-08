import type { WebhookLog } from '../../types/log';

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
}

function LogList({ logs, selectedLogId, onSelect }: LogListProps) {
  return (
    <div>
      {logs.map((log) => (
        <div
          key={log.id}
          onClick={() => onSelect(log.id)}
          data-selected={log.id === selectedLogId}
        >
          {log.method} {log.path}
        </div>
      ))}
    </div>
  );
}

export default LogList;
