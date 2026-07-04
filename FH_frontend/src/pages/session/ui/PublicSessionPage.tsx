import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicLogQuery } from '@/entities/log/api/log.queries';
import styles from './PublicSessionPage.module.css';

export default function PublicSessionPage() {
  const { logId } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const isNoIndex = searchParams.get('noindex') === 'true';
  const navigate = useNavigate();
  const { data: log, isLoading, isError } = usePublicLogQuery(logId);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.center}>
          <p className={styles.subtitle}>데이터를 불러오고 있어요…</p>
        </div>
      </div>
    );
  }

  if (isError || !log) {
    return (
      <div className={styles.container}>
        <div className={styles.center}>
          <h1 className={styles.title}>세션을 찾을 수 없어요</h1>
          <p className={styles.subtitle}>존재하지 않거나 삭제된 로그예요.</p>
          <button 
            onClick={() => navigate('/')}
            className={styles.btnAction}
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = `FlashHook 공유 로그 - ${log.method}`;
  const pageDescription = `안전하게 공유된 FlashHook 로그입니다. 헤더 정보 등 페이로드의 일부를 확인할 수 있습니다.`;

  const formattedDate = (() => {
    try {
      const d = new Date(log.receivedAt);
      return isNaN(d.getTime()) ? '알 수 없는 시간' : d.toLocaleString();
    } catch {
      return '알 수 없는 시간';
    }
  })();

  return (
    <div className={styles.container}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {isNoIndex && <meta name="robots" content="noindex" />}
      </Helmet>
      
      <header className={styles.header}>
        <h1
          className={styles.logo}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/');
          }}
        >
          FlashHook
        </h1>
        <button 
          onClick={() => navigate('/')} 
          className={styles.btnSecondary}
        >
          나도 웹훅 테스트하기
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>공유된 로그</h3>
              <p className={styles.cardDesc}>
                보안을 위해 본문(Body) 데이터는 마스킹 처리했어요.
              </p>
            </div>
            <span className={styles.badge}>{log.method}</span>
          </div>
          
          <div className={styles.cardBody}>
            <dl className={styles.dl}>
              <div>
                <dt className={styles.dt}>받은 시간</dt>
                <dd className={styles.dd}>{formattedDate}</dd>
              </div>
              <div>
                <dt className={styles.dt}>본문 상태</dt>
                <dd className={styles.dd}>
                  <span className={styles.statusBadge}>{log.bodyStatus}</span>
                </dd>
              </div>
              <div className={styles.col2}>
                <dt className={styles.dt}>안전한 헤더 (Allow-list)</dt>
                <dd className={styles.dd}>
                  <div className={styles.preContainer}>
                    <pre className={styles.pre}>
                      {JSON.stringify(log.safeHeaders, null, 2)}
                    </pre>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        <div className={styles.promo}>
          <h2 className={styles.promoTitle}>웹훅 연동, 디버깅이 어렵나요?</h2>
          <p className={styles.promoDesc}>
            FlashHook을 사용하면 로그인 없이 1초 만에 테스트용 웹훅 엔드포인트를 만들고 
            실시간으로 페이로드를 확인할 수 있어요.
          </p>
          <button 
            onClick={() => navigate('/')}
            className={styles.btnAction}
          >
            지금 무료로 시작하기
          </button>
        </div>
      </main>
    </div>
  );
}
