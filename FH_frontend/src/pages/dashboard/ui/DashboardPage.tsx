import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEndpointQuery } from '../../../entities/endpoint/api/endpoint.queries';
import { useLogsQuery } from '../../../entities/log/api/log.queries';
import { useSSE } from '../../../entities/log/api/useSSE';
import { useLogStore } from '../../../entities/log/model/log.store';
import { useIsMobile } from '../../../shared/lib/useIsMobile';
import Header from '../../../widgets/header/ui/Header';
import EndpointInfo from '../../../widgets/endpoint-info/ui/EndpointInfo';
import ConnectionStatus from '../../../widgets/endpoint-info/ui/ConnectionStatus';
import LogList from '../../../widgets/log-viewer/ui/LogList';
import LogDetail from '../../../widgets/log-viewer/ui/LogDetail';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  
  const { data: endpoint, isLoading, error } = useEndpointQuery(endpointId);
  const isMobile = useIsMobile();
  
  // Fetch initial logs
  useLogsQuery(endpointId || '', 0, 50);

  const { logs, selectedLog, addLog, setSelectedLog } = useLogStore();
  const { status } = useSSE(endpointId, addLog);

  if (!endpointId) return <div className={styles.center}>Invalid Endpoint ID</div>;
  if (isLoading) return <div className={styles.center}>Loading...</div>;
  if (error) return <div className={styles.center}>Error: {(error as Error).message}</div>;
  if (!endpoint) return <div className={styles.center}>Endpoint not found</div>;

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
            <LogDetail logId={selectedLog?.logId} endpointId={endpointId} />
          </section>
        )}

        {/* Mobile Bottom Sheet Detail View */}
        <AnimatePresence>
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
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className={styles.bottomSheetHandle} />
                <div className={styles.bottomSheetContent}>
                  <LogDetail logId={selectedLog.logId} endpointId={endpointId} />
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
