import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEndpointQuery } from '@/entities/endpoint/api/endpoint.queries';
import { useLogsQuery } from '@/entities/log/api/log.queries';
import { useRealtimeLogs } from '@/features/realtime-logs';
import { useLogStore } from '@/entities/log/model/log.store';
import { useEndpointStore } from '@/entities/endpoint/model/endpoint.store';
import { useIsMobile } from '@/shared/lib/useIsMobile';
import Header from '@/widgets/header/ui/Header';
import EndpointInfo from '@/widgets/endpoint-info/ui/EndpointInfo';
import ConnectionStatus from '@/widgets/endpoint-info/ui/ConnectionStatus';
import LogList from '@/widgets/log-viewer/ui/LogList';
import LogDetail from '@/widgets/log-viewer/ui/LogDetail';
import { lazy, Suspense } from 'react';
import styles from './DashboardPage.module.css';

const MockConfigPanel = lazy(() => import('@/widgets/mock-config/ui/MockConfigPanel'));

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const [isMockPanelOpen, setIsMockPanelOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(440);
  const [isResizing, setIsResizing] = useState(false);
  const isDragging = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  
  const { data: endpoint, isLoading, error } = useEndpointQuery(endpointId);
  const isMobile = useIsMobile();

  const toggleMockPanel = useCallback(() => {
    setIsMockPanelOpen(prev => !prev);
  }, []);

  const startResizing = useCallback(() => {
    isDragging.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
  }, []);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 440 && newWidth < 800) {
          setSidebarWidth(newWidth);
        }
      });
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsResizing(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      isDragging.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleMockPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMockPanel]);
  
  // Fetch initial logs
  useLogsQuery(endpointId || '', 0, 50);

  const { logs, selectedLog, setSelectedLog } = useLogStore();
  const { status } = useRealtimeLogs(endpointId);
  const addEndpoint = useEndpointStore((state) => state.addEndpoint);

  useEffect(() => {
    if (endpointId && endpoint?.expiresAt) {
      addEndpoint(endpointId, endpoint.expiresAt);
    }
  }, [endpointId, endpoint?.expiresAt, addEndpoint]);

  if (!endpointId) return <div className={styles.center}><p>엔드포인트 ID가 맞지 않아요</p><a href="/" className={styles.btnAction}>홈으로 돌아가기</a></div>;
  if (isLoading) return <div className={styles.center}><div className={styles.spinner}></div><p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>데이터를 불러오고 있어요…</p></div>;
  if (error) return <div className={styles.center}><div className="errorBox">⚠️ 문제가 생겼어요.<br/><br/><span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{(error as Error).message}</span></div><button className={styles.btnAction} onClick={() => window.location.reload()}>다시 시도하기</button></div>;
  if (!endpoint) return <div className={styles.center}><p>엔드포인트를 찾을 수 없어요</p><a href="/" className={styles.btnAction}>홈으로 돌아가기</a></div>;

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
              const log = useLogStore.getState().logMap[logId];
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
            <motion.div layout className={styles.logDetailWrapper} style={{ flex: 1, minWidth: 0 }}>
              <LogDetail logId={selectedLog?.logId} endpointId={endpointId} />
              
              <div className={styles.mockOverlayTrigger}>
                <button className={styles.btnAction} onClick={toggleMockPanel}>
                  ⚡️ Mock 응답 오버라이드 (⌘K)
                </button>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {isMockPanelOpen && (
                <motion.div 
                  className={styles.mockSidebarContainer}
                  initial={{ scaleX: 0, opacity: 0, originX: 1 }}
                  animate={{ scaleX: 1, opacity: 1, originX: 1 }}
                  exit={{ scaleX: 0, opacity: 0, originX: 1 }}
                  transition={isResizing ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 }}
                  style={{ width: sidebarWidth }}
                >
                  <div className={styles.resizeHandle} onPointerDown={startResizing} />
                  <div className={styles.mockSidebarInner} style={{ width: sidebarWidth }}>
                    <div className={styles.mockPanelHeader}>
                      <h3 className={styles.mockPanelTitle}>Mock Configuration</h3>
                      <button className={styles.mockPanelCloseBtn} onClick={() => setIsMockPanelOpen(false)}>✕</button>
                    </div>
                    <div className={styles.mockPanelBody}>
                      <Suspense fallback={<div>Loading...</div>}>
                        <MockConfigPanel endpoint={endpoint} key={endpoint.endpointId} />
                      </Suspense>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                onClick={() => {
                  setSelectedLog(null);
                  setIsMockPanelOpen(false);
                }}
              />
              <motion.div 
                className={styles.bottomSheetContainer}
                role="dialog"
                aria-modal="true"
                aria-label="로그 상세"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={shouldReduceMotion ? undefined : { y: '100%', transition: { type: "tween", duration: 0.15, ease: "easeIn" } }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className={styles.bottomSheetHandle} />
                <div className={styles.bottomSheetContent}>
                  {!isMockPanelOpen ? (
                    <>
                      <LogDetail logId={selectedLog.logId} endpointId={endpointId} />
                      <div className={styles.mockOverlayTriggerMobile}>
                        <button className={styles.btnAction} onClick={toggleMockPanel} style={{ width: '100%' }}>
                          ⚡️ Mock 설정 열기
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.mockPanelHeaderMobile}>
                        <h3 className={styles.mockPanelTitle}>Mock Configuration</h3>
                        <button className={styles.btnAction} onClick={() => setIsMockPanelOpen(false)}>뒤로가기</button>
                      </div>
                      <Suspense fallback={<div>Loading...</div>}>
                        <MockConfigPanel endpoint={endpoint} key={endpoint.endpointId} />
                      </Suspense>
                    </>
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
