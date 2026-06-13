import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEndpointMutation } from '@/entities/endpoint/api/endpoint.queries';
import Footer from '@/widgets/footer/ui/Footer';
import { ConsentModal } from '@/widgets/legal/ConsentModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useEndpointStore } from '@/entities/endpoint/model/endpoint.store';
import { TerminalHero } from './TerminalHero';
import { LandingFeatures } from './LandingFeatures';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEndpoint } = useCreateEndpointMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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
    if (localStorage.getItem('flashhook-consent') === 'true') {
      handleCreate();
    } else {
      setIsConsentOpen(true);
    }
  };

  const handleAcceptConsent = () => {
    localStorage.setItem('flashhook-consent', 'true');
    handleCreate();
  };

  const handleCreate = async () => {
    if (isLoading) return;
    setIsConsentOpen(false);
    setIsLoading(true);
    setError(null);
    setTerminalLines(prev => [...prev, '$ flashhook create-endpoint', '> Generating secure URL...']);
    try {
      const response = await createEndpoint(undefined);
      setTerminalLines(prev => [...prev, `> Success! ID: ${response.endpointId}`, '> Redirecting to dashboard...']);
      addEndpoint(response.endpointId, response.expiresAt);
      timerRef.current = setTimeout(() => {
        navigate(`/dashboard/${encodeURIComponent(response.endpointId)}`);
      }, 500);
    } catch (err: unknown) {
      setTerminalLines(prev => [...prev, '> Error: Failed to create endpoint']);
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <TerminalHero 
        terminalLines={terminalLines}
        isLoading={isLoading}
        error={error}
        endpoints={endpoints}
        now={now}
        onCreateClick={handleCreateClick}
        onDeleteClick={setDeleteTargetId}
      />
      <LandingFeatures />
      <Footer />
      
      <ConsentModal 
        isOpen={isConsentOpen} 
        onAccept={handleAcceptConsent} 
        onDecline={() => setIsConsentOpen(false)} 
      />
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="엔드포인트 삭제"
        message="이 엔드포인트의 접근 기록을 삭제하시겠습니까? (서버의 데이터는 삭제되지 않습니다)"
        onConfirm={() => {
          if (deleteTargetId) removeEndpoint(deleteTargetId);
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

export default LandingPage;
