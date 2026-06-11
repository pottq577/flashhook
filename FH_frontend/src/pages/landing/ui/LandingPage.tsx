import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCreateEndpointMutation } from '@/entities/endpoint/api/endpoint.queries';
import Footer from '@/widgets/footer/ui/Footer';
import { ConsentModal } from '@/widgets/legal/ConsentModal';
import { useEndpointStore } from '@/entities/endpoint/model/endpoint.store';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEndpoint } = useCreateEndpointMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>(['$ flashhook --init', '> System ready. Waiting for command...']);
  
  const { endpoints, clearExpired, removeEndpoint, addEndpoint } = useEndpointStore();
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearExpired();
    const interval = setInterval(() => {
      setNow(Date.now());
      clearExpired();
    }, 60000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [clearExpired]);

  const handleCreateClick = () => {
    setIsConsentOpen(true);
  };

  const handleCreate = async () => {
    setIsConsentOpen(false);
    setIsLoading(true);
    setError(null);
    setTerminalLines(prev => [...prev, '$ flashhook create-endpoint', '> Generating secure URL...']);
    try {
      const response = await createEndpoint(undefined);
      setTerminalLines(prev => [...prev, `> Success! ID: ${response.endpointId}`, '> Redirecting to dashboard...']);
      addEndpoint(response.endpointId, response.expiresAt);
      timerRef.current = setTimeout(() => {
        navigate(`/dashboard/${response.endpointId}`);
      }, 500);
    } catch (err: unknown) {
      setTerminalLines(prev => [...prev, '> Error: Failed to create endpoint']);
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.terminalContainer}>
          <div className={styles.terminalHeader}>
            <div className={styles.macButtons}>
              <span className={styles.close}></span>
              <span className={styles.minimize}></span>
              <span className={styles.maximize}></span>
            </div>
            <div className={styles.terminalTitle}>bash - flashhook</div>
          </div>
          <div className={styles.terminalBody}>
            {terminalLines.map((line, index) => (
              <div key={index} className={line.startsWith('$') ? styles.commandLine : styles.outputLine}>
                {line}
              </div>
            ))}
            {!isLoading && (
              <div className={styles.activeLine}>
                <span className={styles.prompt}>$</span>
                <span className={styles.cursor}></span>
              </div>
            )}
          </div>
          
          <div className={styles.terminalActions}>
            <h1 className={styles.title}>FlashHook</h1>
            <p className={styles.subtitle}>회원가입 없이 1초 만에 웹훅을 받아보고 테스트할 수 있어요.</p>
            
            <button 
              className={styles.button} 
              onClick={handleCreateClick}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? '[ CREATING... ]' : '[ CREATE_NEW_ENDPOINT ]'}
            </button>
            
            {error && <div className={styles.errorBox} role="alert">Error: {error}</div>}

            {endpoints.length > 0 && (
              <div className={styles.recentEndpoints}>
                <div className={styles.recentTitle}>&gt; RECENT_SESSIONS</div>
                <div className={styles.recentList}>
                  {endpoints.map((ep) => {
                    const diffMins = Math.floor((now - ep.createdAt) / 60000);
                    const timeStr = diffMins < 60 ? `${diffMins}분 전` : `${Math.floor(diffMins / 60)}시간 전`;
                    const shortId = ep.id.substring(0, 8);
                    
                    return (
                      <div key={ep.id} className={styles.recentItemWrapper}>
                        <Link to={`/dashboard/${ep.id}`} className={styles.recentItem}>
                          <span className={styles.recentPrefix}>$ resume</span>
                          <span className={styles.recentId}>{shortId}</span>
                          <span className={styles.recentTime}>[{timeStr}]</span>
                        </Link>
                        <button 
                          className={styles.recentRemove} 
                          onClick={() => removeEndpoint(ep.id)}
                          title="기록 삭제"
                          aria-label="기록 삭제"
                        >
                          [✕]
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Feature Section */}
      <section className={styles.section}>
        <div className={styles.splitContent}>
          <div className={styles.textContent}>
            <h2 className={styles.sectionTitle}>01. Instant Setup</h2>
            <p className={styles.textBody}>
              불필요한 가입 절차나 CLI 설치 없이 바로 쓸 수 있어요. 임시 URL을 발급받고 터미널로 돌아가세요.
            </p>
          </div>
          <div className={styles.codeBlock}>
            <code>
              <span className={styles.keyword}>curl</span> -X POST \<br/>
              &nbsp;&nbsp;https://flashhook.dev/api/e/<span className={styles.variable}>YOUR_ID</span> \<br/>
              &nbsp;&nbsp;-H <span className={styles.string}>"Content-Type: application/json"</span> \<br/>
              &nbsp;&nbsp;-d <span className={styles.string}>'{"{"}"event": "payment.success"{"}"}'</span>
            </code>
          </div>
        </div>
        
        <div className={styles.splitContent}>
          <div className={styles.codeBlock}>
            <code>
              <span className={styles.comment}>// Real-time incoming payload</span><br/>
              {"{"}<br/>
              &nbsp;&nbsp;<span className={styles.key}>"method"</span>: <span className={styles.string}>"POST"</span>,<br/>
              &nbsp;&nbsp;<span className={styles.key}>"headers"</span>: {"{"}<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.key}>"content-type"</span>: <span className={styles.string}>"application/json"</span><br/>
              &nbsp;&nbsp;{"}"},<br/>
              &nbsp;&nbsp;<span className={styles.key}>"body"</span>: {"{"}<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.key}>"event"</span>: <span className={styles.string}>"payment.success"</span><br/>
              &nbsp;&nbsp;{"}"}<br/>
              {"}"}
            </code>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.sectionTitle}>02. Real-time Inspection</h2>
            <p className={styles.textBody}>
              대시보드에서 실시간으로 웹훅 내용을 확인할 수 있어요. 남은 로그는 24시간 뒤에 안전하게 모두 지울게요.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <ConsentModal 
        isOpen={isConsentOpen} 
        onAccept={handleCreate} 
        onDecline={() => setIsConsentOpen(false)} 
      />
    </div>
  );
}

export default LandingPage;
