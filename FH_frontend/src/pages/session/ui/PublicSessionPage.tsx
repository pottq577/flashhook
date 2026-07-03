import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicLogQuery } from '@/entities/log/api/log.queries';

export default function PublicSessionPage() {
  const { logId } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const isNoIndex = searchParams.get('noindex') === 'true';
  const navigate = useNavigate();
  const { data: log, isLoading, isError } = usePublicLogQuery(logId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500">로딩 중이에요...</p>
      </div>
    );
  }

  if (isError || !log) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">세션을 찾을 수 없어요</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">존재하지 않거나 삭제된 로그예요.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // Dynamic OG tags for bots handling (if bots execute JS, which is unlikely, but good practice).
  // For non-JS bots, Edge Middleware handles this.
  const pageTitle = `FlashHook 공유 로그 - ${log.method}`;
  const pageDescription = `안전하게 공유된 FlashHook 로그입니다. 헤더 정보 등 페이로드의 일부를 확인할 수 있습니다.`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] font-sans">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {isNoIndex && <meta name="robots" content="noindex" />}
      </Helmet>
      
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => navigate('/')}>FlashHook</h1>
          <button 
            onClick={() => navigate('/')} 
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            나도 웹훅 테스트하기
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-[#1a1a1a] shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                공유된 로그
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                보안을 위해 본문(Body) 데이터는 마스킹 처리했어요.
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {log.method}
            </span>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">받은 시간</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(log.receivedAt).toLocaleString()}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">본문 상태</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded inline-block">
                  {log.bodyStatus}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">안전한 헤더 (Allow-list)</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                    <pre className="text-green-400 font-mono text-sm">
                      {JSON.stringify(log.safeHeaders, null, 2)}
                    </pre>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        <div className="mt-8 text-center bg-blue-50 dark:bg-blue-900/10 p-8 rounded-lg border border-blue-100 dark:border-blue-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">웹훅 연동, 디버깅이 어렵나요?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            FlashHook을 사용하면 로그인 없이 1초 만에 테스트용 웹훅 엔드포인트를 만들고 
            실시간으로 페이로드를 확인할 수 있어요.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            지금 무료로 시작하기
          </button>
        </div>
      </main>
    </div>
  );
}
