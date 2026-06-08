import type { WebhookLog } from '../../types/log';

interface LogItemProps {
  log: WebhookLog;
  isSelected: boolean;
  onClick: () => void;
}

function LogItem({ log, isSelected, onClick }: LogItemProps) {
  return (
    <div onClick={onClick} data-selected={isSelected}>
      {log.method} {log.path}
    </div>
  );
}

export default LogItem;
