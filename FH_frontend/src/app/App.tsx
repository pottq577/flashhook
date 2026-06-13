import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { CookieBanner } from '@/widgets/legal/CookieBanner';

const LandingPage = lazy(() => import('@/pages/landing/ui/LandingPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/ui/DashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/ui/NotFoundPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage').then(module => ({ default: module.TermsOfServicePage })));
const AboutPage = lazy(() => import('@/pages/about/ui/AboutPage'));
const ContactPage = lazy(() => import('@/pages/about/ui/ContactPage'));

// 개발 환경에서만 DevTools 번들 로드
const DevTools = import.meta.env.DEV 
  ? lazy(() => import('@/widgets/dev-tools/ui/DevTools').then(m => ({ default: m.DevTools })))
  : () => null;
function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <main>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>로딩중...</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <CookieBanner />
        <ToastContainer />
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
