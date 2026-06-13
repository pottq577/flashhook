import type { WebhookLog } from '@/entities/log/model/log.schema';
import { Virtuoso } from 'react-virtuoso';
import { useState, useMemo } from 'react';
import { useDeleteAllLogsMutation } from '@/entities/log/api/log.queries';
import LogItem from './LogItem';
import styles from './LogList.module.css';

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
  endpointId?: string;
}

function LogList({ logs, selectedLogId, onSelect, endpointId }: LogListProps) {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('ALL');
  const deleteMutation = useDeleteAllLogsMutation(endpointId || '');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchMethod = method === 'ALL' || log.method.toUpperCase() === method;
      const matchSearch = search.trim() === '' || 
        log.method.toLowerCase().includes(search.toLowerCase()) ||
        (log.bodyPreview && log.bodyPreview.toLowerCase().includes(search.toLowerCase()));
      return matchMethod && matchSearch;
    });
  }, [logs, search, method]);

  const handleClear = () => {
    if (window.confirm('모든 로그를 삭제할까요? 이 작업은 되돌릴 수 없어요.')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <input 
            type="text" 
            placeholder="Search payload..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={styles.filterSelect}>
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        {endpointId && (
          <div className={styles.headerRow} style={{ justifyContent: 'flex-end' }}>
            <button 
              className={styles.clearBtn} 
              onClick={handleClear} 
              disabled={deleteMutation.isPending || logs.length === 0}
            >
              {deleteMutation.isPending ? 'Clearing...' : 'Clear Logs'}
            </button>
          </div>
        )}
      </div>

      {filteredLogs.length === 0 ? (
        <div role="status" className={styles.empty}>
          <p>{logs.length === 0 ? '아직 들어온 웹훅이 없어요.' : '검색 결과가 없어요.'}</p>
          {logs.length === 0 && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>위의 웹훅 URL로 요청을 보내면 이곳에서 실시간으로 확인할 수 있어요.</p>}
        </div>
      ) : (
        <Virtuoso
          style={{ height: '100%' }}
          data={filteredLogs}
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
      )}
    </div>
  );
}

export default LogList;
