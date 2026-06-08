import type { WebhookLogDetail } from '../../types/log';

interface LogDetailProps {
  log: WebhookLogDetail | null;
}

function LogDetail({ log }: LogDetailProps) {
  if (!log) return <div>LogDetail: No log selected</div>;

  return <div>LogDetail: {log.id}</div>;
}

export default LogDetail;
