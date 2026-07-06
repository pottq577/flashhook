import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEndpointQuery } from "@/entities/endpoint";
import {
  useLogsQuery,
  useLogStore,
  createLogDetailFromLog,
} from "@/entities/log";
import { useRealtimeLogs } from "@/features/realtime-logs";
import { useEndpointStore } from "@/entities/endpoint";
import { useIsMobile } from "@/shared/lib/useIsMobile";
import { useShortcut } from "@/shared/lib/useShortcut";
import { useSidebarResize } from "@/features/dashboard-layout";
import { Header } from "@/widgets/header";
import { EndpointInfo, ConnectionStatus } from "@/widgets/endpoint-info";
import { LogList, LogDetail } from "@/widgets/log-viewer";
import { lazy, Suspense } from "react";
import { AdBanner } from "@/shared/ui/AdBanner/AdBanner";
import { resolveApiBaseUrl } from "@/shared/config/api";
import { SEOHead } from "@/shared/ui/SEOHead";
import styles from "@/pages/dashboard/ui/DashboardPage.module.css";
import { Skeleton } from "@/shared/ui/Skeleton";

const MockPanelSkeleton = (
  <div
    className={styles.mockPanelSkeleton}
    style={{
      padding: "1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    }}
  >
    <Skeleton width="100%" height="40px" />
    <Skeleton width="100%" height="150px" />
    <Skeleton width="40%" height="40px" />
  </div>
);

const MockConfigPanel = lazy(
  () => import("@/widgets/mock-config/ui/MockConfigPanel"),
);

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const webhookUrl = endpointId
    ? new URL(
        `${resolveApiBaseUrl()}/hooks/${encodeURIComponent(endpointId)}`,
        window.location.origin,
      ).toString()
    : undefined;
  const [isMockPanelOpen, setIsMockPanelOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { sidebarWidth: leftSidebarWidth, startResizing: startLeftResizing } =
    useSidebarResize(380, 250, 600, "left");

  const { sidebarWidth, isResizing, startResizing } = useSidebarResize(
    440,
    440,
    800,
    "right",
  );
  const {
    data: endpoint,
    isLoading,
    error,
    refetch,
  } = useEndpointQuery(endpointId);

  const toggleMockPanel = useCallback(
    () => setIsMockPanelOpen((prev) => !prev),
    [],
  );
  useShortcut("k", toggleMockPanel);

  useLogsQuery(endpointId || "", 0, 50);

  const { logs, selectedLog, setSelectedLog } = useLogStore();
  const { status } = useRealtimeLogs(endpointId);
  const addEndpoint = useEndpointStore((state) => state.addEndpoint);

  const handleSelectLog = useCallback(
    (logId: string) => {
      const log = useLogStore.getState().logMap[logId];
      setSelectedLog(createLogDetailFromLog(log, logId));
    },
    [setSelectedLog],
  );

  useEffect(() => {
    if (endpointId && endpoint?.expiresAt) {
      addEndpoint(endpointId, endpoint.expiresAt);
    }
  }, [endpointId, endpoint?.expiresAt, addEndpoint]);

  // 데스크톱 환경에서는 항상 최근 로그(첫 번째)를 기본으로 보여주도록 자동 선택
  useEffect(() => {
    if (!isMobile && logs.length > 0 && !selectedLog) {
      handleSelectLog(logs[0].logId);
    }
  }, [isMobile, logs, selectedLog, handleSelectLog]);

  const pageTitle = endpointId
    ? `[${endpointId.slice(0, 6)}] 대시보드 - FlashHook`
    : "대시보드 - FlashHook";

  if (!endpointId)
    return (
      <div className={styles.container}>
        <SEOHead title={pageTitle} />
        <Header />
        <div className={styles.center}>
          <p>엔드포인트 ID가 맞지 않아요</p>
          <a href="/" className={styles.btnAction}>
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  if (isLoading)
    return (
      <div className={styles.container}>
        <SEOHead title={pageTitle} />
        <Header />
        <main className={styles.main}>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "calc(100vh - 64px)",
            }}
          >
            {/* Sidebar Skeleton */}
            <div
              style={{
                width: "380px",
                borderRight: "1px solid var(--border)",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <Skeleton width="100%" height="40px" />
              <div style={{ marginTop: "1rem" }} />
              <Skeleton width="100%" height="72px" />
              <Skeleton width="100%" height="72px" />
              <Skeleton width="100%" height="72px" />
            </div>
            {/* Content Skeleton */}
            <div
              style={{
                flex: 1,
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", gap: "1rem", alignItems: "center" }}
                >
                  <Skeleton width="80px" height="32px" />
                  <Skeleton width="300px" height="32px" />
                </div>
                <Skeleton width="200px" height="40px" />
              </div>
              <Skeleton width="40%" height="24px" />
              <Skeleton width="100%" height="300px" />
            </div>
          </div>
        </main>
      </div>
    );
  if (error) {
    const err = error as { status?: number; code?: string; message?: string };
    const isAuthError =
      err.status === 401 ||
      err.status === 403 ||
      err.code === "INVALID_TOKEN" ||
      err.code === "ENDPOINT_NOT_FOUND";

    return (
      <div className={styles.container}>
        <SEOHead title={pageTitle} />
        <Header />
        <div className={styles.center}>
          <div className="errorBox">
            <h2>⚠️ 문제가 생겼어요.</h2>
            <p>엔드포인트 정보를 불러오지 못했어요.</p>
            <span
              style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              {(error as Error).message}
            </span>
          </div>
          {isAuthError ? (
            <a href="/" className={styles.btnAction}>
              홈으로 돌아가기
            </a>
          ) : (
            <button className={styles.btnAction} onClick={() => void refetch()}>
              다시 시도하기
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!endpoint)
    return (
      <div className={styles.container}>
        <SEOHead title={pageTitle} />
        <Header />
        <div className={styles.center}>
          <p>엔드포인트를 찾을 수 없어요</p>
          <a href="/" className={styles.btnAction}>
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );

  return (
    <div className={styles.container}>
      <SEOHead title={pageTitle} />
      <Header />
      <h1 className={styles.srOnly}>웹훅 대시보드</h1>
      <EndpointInfo endpoint={endpoint} />
      <ConnectionStatus status={status} />
      {/* 모바일 컴팩트 광고 (상단 배치) */}
      {isMobile && (
        <div style={{ padding: "0 1rem", paddingBottom: "0.5rem" }}>
          {/* TODO: 애드센스 심사 통과 후 모바일용 신규 디스플레이 광고 단위를 생성하여 dataAdSlot ID 교체 */}
          <AdBanner variant="compact" dataAdSlot="MOBILE_SLOT_ID_HERE" />
        </div>
      )}

      <main className={styles.main}>
        <section
          className={styles.sidebar}
          style={
            !isMobile ? { width: leftSidebarWidth, flexShrink: 0 } : undefined
          }
        >
          <LogList
            logs={logs}
            selectedLogId={selectedLog?.logId || null}
            onSelect={handleSelectLog}
            endpointId={endpointId}
          />
          
          {/* 데스크탑 패널 광고 (사이드바 하단 배치) */}
          {/* TODO: 애드센스 심사 통과 후 데스크탑용 신규 디스플레이 광고 단위를 생성하여 dataAdSlot ID 교체 */}
          {!isMobile && <AdBanner variant="panel" dataAdSlot="DESKTOP_SLOT_ID_HERE" />}

          {!isMobile ? (
            <div
              className={styles.leftResizeHandle}
              onPointerDown={startLeftResizing}
            />
          ) : null}
        </section>

        {/* Desktop Detail View */}
        {!isMobile ? (
          <section className={styles.content}>
            <motion.div
              layout
              className={styles.logDetailWrapper}
              style={{ flex: 1, minWidth: 0 }}
            >
              <LogDetail
                logId={selectedLog?.logId}
                endpointId={endpointId}
                webhookUrl={webhookUrl}
              />

              <div className={styles.mockOverlayTrigger}>
                <button className={styles.btnAction} onClick={toggleMockPanel}>
                  ⚡️ Mock 응답 오버라이드 (⌘K)
                </button>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {isMockPanelOpen ? (
                <motion.div
                  className={styles.mockSidebarContainer}
                  initial={{ scaleX: 0, opacity: 0, originX: 1 }}
                  animate={{ scaleX: 1, opacity: 1, originX: 1 }}
                  exit={{ scaleX: 0, opacity: 0, originX: 1 }}
                  transition={
                    isResizing
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0, duration: 0.25 }
                  }
                  style={{ width: sidebarWidth }}
                >
                  <div
                    className={styles.resizeHandle}
                    onPointerDown={startResizing}
                  />
                  <div
                    className={styles.mockSidebarInner}
                    style={{ width: sidebarWidth }}
                  >
                    <div className={styles.mockPanelHeader}>
                      <h3 className={styles.mockPanelTitle}>
                        Mock Configuration
                      </h3>
                      <button
                        className={styles.mockPanelCloseBtn}
                        onClick={() => setIsMockPanelOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.mockPanelBody}>
                      <Suspense fallback={MockPanelSkeleton}>
                        <MockConfigPanel
                          endpoint={endpoint}
                          key={endpoint.endpointId}
                          onSuccess={() => setIsMockPanelOpen(false)}
                        />
                      </Suspense>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        ) : null}

        {/* Mobile Bottom Sheet Detail View */}
        <AnimatePresence initial={false}>
          {isMobile && (selectedLog || isMockPanelOpen) ? (
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
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: "100%",
                        transition: {
                          type: "tween",
                          duration: 0.15,
                          ease: "easeIn",
                        },
                      }
                }
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className={styles.bottomSheetHandle} />
                <div className={styles.bottomSheetContent}>
                  {!isMockPanelOpen && selectedLog ? (
                    <>
                      <LogDetail
                        logId={selectedLog.logId}
                        endpointId={endpointId}
                        webhookUrl={webhookUrl}
                      />
                    </>
                  ) : isMockPanelOpen ? (
                    <>
                      <div className={styles.mockPanelHeaderMobile}>
                        <h3 className={styles.mockPanelTitle}>
                          Mock Configuration
                        </h3>
                        <button
                          className={styles.btnAction}
                          onClick={() => setIsMockPanelOpen(false)}
                        >
                          뒤로가기
                        </button>
                      </div>
                      <Suspense fallback={MockPanelSkeleton}>
                        <MockConfigPanel
                          endpoint={endpoint}
                          key={endpoint.endpointId}
                          onSuccess={() => setIsMockPanelOpen(false)}
                        />
                      </Suspense>
                    </>
                  ) : null}
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        {/* Mobile Fixed Mock FAB */}
        {isMobile && !isMockPanelOpen && (
          <div className={styles.mobileFixedBottomBar}>
            <button
              className={styles.btnAction}
              onClick={toggleMockPanel}
              aria-label="Mock 설정 열기"
            >
              ⚡️ Mock 응답 설정
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
