import { useState } from 'react';
import { useLogDetailQuery, useReplayLogMutation } from '@/entities/log/api/log.queries';
import MethodBadge from '@/shared/ui/MethodBadge';
import PromptModal from '@/shared/ui/PromptModal';
import { useToastStore } from '@/shared/lib/toast.store';
import JsonViewer from './JsonViewer';
import styles from './LogDetail.module.css';

interface LogDetailProps {
  logId?: string;
  endpointId?: string;
}

function LogDetail({ logId, endpointId }: LogDetailProps) {
  const { data: log, isLoading } = useLogDetailQuery(endpointId || '', logId);
  const replayMutation = useReplayLogMutation();
  const addToast = useToastStore((state) => state.addToast);
  const [copied, setCopied] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  if (isLoading) {
    return <div role="status" className={styles.emptyContainer}>&gt; LOADING_PAYLOAD…</div>;
  }

  if (!log) {
    if (!endpointId) {
      return (
        <div role="status" className={styles.emptyContainer}>
          <div className={styles.emptyText}>
            <div className={styles.emptyTitle}>&gt; WAITING_FOR_ENDPOINT…</div>
            <p className={styles.emptyDesc}>엔드포인트를 먼저 만들거나 선택해 주세요.</p>
          </div>
        </div>
      );
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://flashhook.kr/api').replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/hooks/${endpointId}`;
    const curlCommand = `curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Hello from FlashHook!"}'`;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(curlCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    };

    return (
      <div role="status" className={styles.emptyContainer}>
        <div className={styles.emptyText}>
          <div className={styles.emptyTitle}>&gt; WAITING_FOR_REQUEST…</div>
          <p className={styles.emptyDesc}>아직 들어온 요청이 없어요. 아래 명령어로 테스트 웹훅을 보내보세요.</p>
          <div className={styles.curlBlock}>
            <div className={styles.curlHeader}>
              <div className={styles.macControls} aria-hidden="true">
                <span className={styles.macDot} style={{ backgroundColor: '#ff5f56' }} />
                <span className={styles.macDot} style={{ backgroundColor: '#ffbd2e' }} />
                <span className={styles.macDot} style={{ backgroundColor: '#27c93f' }} />
              </div>
              <span className={styles.curlLabel}>bash</span>
              <button
                className={styles.copyButton}
                onClick={handleCopy}
                title={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
                aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <div className={styles.curlCodeWrapper}>
              <code>{curlCommand}</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(log.receivedAt);
  const isValidDate = !isNaN(date.getTime());
  const dateString = isValidDate ? date.toLocaleString() : 'INVALID_DATE';

  const handleReplayClick = () => {
    setIsPromptOpen(true);
  };

  const handleConfirmReplay = (rawDestinationUrl: string) => {
    const destinationUrl = rawDestinationUrl.trim();
    if (!destinationUrl) return;
    setIsPromptOpen(false);
    if (endpointId && logId) {
      replayMutation.mutate(
        { endpointId, logId, destinationUrl },
        {
          onSuccess: () => {
            addToast(`[Replay] ${destinationUrl} 로 재전송을 요청했어요.`, 3000);
          },
          onError: (err) => {
            addToast(`[Replay] 재전송에 실패했어요: ${err.message}`, 4000);
          }
        }
      );
    }
  };

  return (
    <div className={styles.container} data-testid="log-detail">
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MethodBadge method={log.method} />
          <span className={styles.url}>{log.url}</span>
        </div>
        <button 
          className={styles.copyButton} 
          style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', borderColor: 'var(--primary-color)' }}
          onClick={handleReplayClick}
          disabled={replayMutation.isPending}
        >
          {replayMutation.isPending ? 'REPLAYING...' : 'REPLAY'}
        </button>
      </div>

      <div className={styles.metaInfo}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>TIMESTAMP</span>
          <span>{dateString}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>CLIENT_IP</span>
          <span>{log.clientIp}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>CONTENT_TYPE</span>
          <span>{log.contentType || 'NONE'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>PAYLOAD_SIZE</span>
          <span>{Math.max(0, log.bodySize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ HEADERS ]</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.headers || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.headers || Object.keys(log.headers).length === 0) && <div role="status" className={styles.empty}>NO_HEADERS</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ QUERY_PARAMETERS ]</h3>
        <div className={styles.keyValueMap}>
          {Object.entries(log.queryParams || {}).map(([key, value]) => (
            <div key={key} className={styles.keyValueRow}>
              <span className={styles.key}>{key}:</span>
              <span className={styles.value}>{String(value)}</span>
            </div>
          ))}
          {(!log.queryParams || Object.keys(log.queryParams).length === 0) && <div role="status" className={styles.empty}>NO_QUERY_PARAMS</div>}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>[ BODY ]</h3>
        <JsonViewer data={log.body} />
      </div>

      <PromptModal
        isOpen={isPromptOpen}
        title="웹훅 재전송"
        message="어디로 재전송할까요? 전체 URL을 입력해 주세요."
        defaultValue="http://localhost:3000/webhook"
        placeholder="https://example.com/webhook"
        confirmText="재전송"
        onConfirm={handleConfirmReplay}
        onCancel={() => setIsPromptOpen(false)}
      />
    </div>
  );
}

export default LogDetail;
