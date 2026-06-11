import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEndpointMutation } from '@/entities/endpoint/api/endpoint.queries';
import Footer from '@/widgets/footer/ui/Footer';
import { ConsentModal } from '@/widgets/legal/ConsentModal';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEndpoint } = useCreateEndpointMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(false);

  const handleCreateClick = () => {
    setIsConsentOpen(true);
  };

  const handleCreate = async () => {
    setIsConsentOpen(false);
    setIsLoading(true);
    setError(null);
    try {
      const response = await createEndpoint(undefined);
      navigate(`/dashboard/${response.endpointId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <h1 className={styles.title}>⚡ FlashHook</h1>
        <p className={styles.subtitle}>회원가입 없이 1초 만에 웹훅을 수신하고 디버깅하세요.</p>
        
        <div className={styles.card}>
          <h2>새 웹훅 URL 생성</h2>
          <p className={styles.description}>
            실시간으로 웹훅을 수신하고 검사할 수 있는 임시 URL을 즉시 생성합니다.
            모든 데이터는 안전하게 격리되며 24시간 후 자동 파기됩니다.
          </p>
          
          <button 
            className={styles.button} 
            onClick={handleCreateClick}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? '생성 중...' : 'URL 생성하기'}
          </button>
          
          {error && <div className={styles.errorBox} role="alert">⚠️ {error}</div>}
        </div>
      </header>

      {/* Features Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>주요 기능</h2>
        <div className={styles.grid}>
          <div className={styles.featureItem}>
            <h3>🚀 즉각적인 생성</h3>
            <p>회원가입이나 CLI 설치가 필요 없습니다. 버튼 클릭 한 번으로 웹훅 URL을 즉시 발급받으세요.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>⚡ 실시간 로깅</h3>
            <p>Server-Sent Events(SSE)를 통해 인입되는 요청이 대시보드에 실시간으로 표시됩니다.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>🎭 Mock 응답 설정</h3>
            <p>특정 API 응답을 시뮬레이션하기 위해 커스텀 HTTP 상태 코드, 헤더, JSON 본문을 설정할 수 있습니다.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>🛡️ 프라이버시 최우선</h3>
            <p>발급된 고유 엔드포인트와 관련된 모든 로그 데이터는 24시간 후 서버에서 영구적으로 파기됩니다.</p>
          </div>
        </div>
      </section>

      {/* How to use Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>사용 방법</h2>
        <ol className={styles.steps}>
          <li><strong>생성:</strong> 상단의 "URL 생성하기" 버튼을 클릭합니다.</li>
          <li><strong>복사:</strong> 대시보드에서 생성된 고유 웹훅 URL을 복사합니다.</li>
          <li><strong>설정:</strong> 연동하려는 외부 서비스(예: 토스페이먼츠, 포트원, GitHub 등)의 웹훅 설정란에 붙여넣습니다.</li>
          <li><strong>검사:</strong> 헤더, 본문, 쿼리 파라미터가 포함된 요청이 실시간으로 대시보드에 수신되는 것을 확인합니다.</li>
        </ol>
      </section>

      {/* FAQ Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <h3>FlashHook은 무료인가요?</h3>
            <p>네, FlashHook은 개인 개발자를 위해 완전히 무료로 제공됩니다. 더 나은 연동 개발을 돕기 위한 커뮤니티 유틸리티입니다.</p>
          </div>
          <div className={styles.faqItem}>
            <h3>로그는 얼마나 보관되나요?</h3>
            <p>프라이버시 보호와 쾌적한 시스템 성능 유지를 위해, 모든 웹훅 엔드포인트와 로그는 생성 후 24시간이 지나면 자동으로 완전 삭제됩니다.</p>
          </div>
          <div className={styles.faqItem}>
            <h3>HTTP 응답을 커스터마이징 할 수 있나요?</h3>
            <p>물론입니다. 대시보드의 "Mock Config" 탭을 사용하여 수신되는 요청에 대해 사용자가 원하는 커스텀 상태 코드, 지연 시간, JSON 본문을 설정할 수 있습니다.</p>
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
