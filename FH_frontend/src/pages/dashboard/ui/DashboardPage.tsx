import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEndpointQuery } from '@/entities/endpoint/api/endpoint.queries';
import { useLogsQuery } from '@/entities/log/api/log.queries';
import { useRealtimeLogs } from '@/features/realtime-logs';
import { useLogStore } from '@/entities/log/model/log.store';
import { useIsMobile } from '@/shared/lib/useIsMobile';
import Header from '@/widgets/header/ui/Header';
import EndpointInfo from '@/widgets/endpoint-info/ui/EndpointInfo';
import ConnectionStatus from '@/widgets/endpoint-info/ui/ConnectionStatus';
import LogList from '@/widgets/log-viewer/ui/LogList';
import LogDetail from '@/widgets/log-viewer/ui/LogDetail';
import MockConfigPanel from '@/widgets/mock-config/ui/MockConfigPanel';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const [activeTab, setActiveTab] = useState<'log' | 'mock'>('log');
  
  const { data: endpoint, isLoading, error } = useEndpointQuery(endpointId);
  const isMobile = useIsMobile();
  
  // Fetch initial logs
  useLogsQuery(endpointId || '', 0, 50);

  const { logs, selectedLog, setSelectedLog } = useLogStore();
  const { status } = useRealtimeLogs(endpointId);

  if (!endpointId) return <div className={styles.center}><p>유효하지 않은 엔드포인트 ID입니다</p><a href="/" className={styles.btnAction}>홈으로 가기</a></div>;
  if (isLoading) return <div className={styles.center}><div className={styles.spinner}></div><p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>데이터를 불러오는 중입니다…</p></div>;
  if (error) return <div className={styles.center}><div className={styles.errorBox}>⚠️ 오류가 발생했습니다.<br/><br/><span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{(error as Error).message}</span></div><button className={styles.btnAction} onClick={() => window.location.reload()}>재시도</button></div>;
  if (!endpoint) return <div className={styles.center}><p>엔드포인트를 찾을 수 없습니다</p><a href="/" className={styles.btnAction}>홈으로 가기</a></div>;

  return (
    <div className={styles.container}>
      <Header />
      <EndpointInfo endpoint={endpoint} />
      <ConnectionStatus status={status} />
      
      <main className={styles.main}>
        <section className={styles.sidebar}>
          <LogList 
            logs={logs} 
            selectedLogId={selectedLog?.logId || null} 
            onSelect={(logId) => {
              const log = logs.find(l => l.logId === logId);
              if (log) {
                setSelectedLog({ ...log, url: '', headers: {}, queryParams: {}, body: {} }); 
              }
            }} 
            endpointId={endpointId}
          />
        </section>
        
        {/* Desktop Detail View */}
        {!isMobile && (
          <section className={styles.content}>
            <div className={styles.tabs}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'log' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('log')}
              >
                로그 상세
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'mock' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('mock')}
              >
                Mock 설정
              </button>
            </div>
            <div className={styles.tabContent}>
              {activeTab === 'log' ? (
                <LogDetail logId={selectedLog?.logId} endpointId={endpointId} />
              ) : (
                <MockConfigPanel endpoint={endpoint} />
              )}
            </div>
          </section>
        )}

        {/* Mobile Bottom Sheet Detail View */}
        <AnimatePresence initial={false}>
          {isMobile && selectedLog && (
            <>
              <motion.button
                type="button"
                className={styles.bottomSheetOverlay}
                aria-label="로그 상세 닫기"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLog(null)}
              />
              <motion.div 
                className={styles.bottomSheetContainer}
                role="dialog"
                aria-modal="true"
                aria-label="로그 상세"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%', transition: { type: "tween", duration: 0.15, ease: "easeIn" } }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className={styles.bottomSheetHandle} />
                <div className={styles.bottomSheetContent}>
                  <div className={styles.tabsMobile}>
                    <button 
                      className={`${styles.tabBtn} ${activeTab === 'log' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('log')}
                    >
                      로그 상세
                    </button>
                    <button 
                      className={`${styles.tabBtn} ${activeTab === 'mock' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('mock')}
                    >
                      Mock 설정
                    </button>
                  </div>
                  {activeTab === 'log' ? (
                    <LogDetail logId={selectedLog.logId} endpointId={endpointId} />
                  ) : (
                    <MockConfigPanel endpoint={endpoint} />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default DashboardPage;
