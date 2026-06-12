import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/landing/ui/LandingPage';
import DashboardPage from '@/pages/dashboard/ui/DashboardPage';
import NotFoundPage from '@/pages/not-found/ui/NotFoundPage';
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/legal/TermsOfServicePage';
import { CookieBanner } from '@/widgets/legal/CookieBanner';
import AboutPage from '@/pages/about/ui/AboutPage';
import ContactPage from '@/pages/about/ui/ContactPage';
import { QueryProvider } from './providers/QueryProvider';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { lazy, Suspense } from 'react';

// 개발 환경에서만 DevTools 번들 로드
const DevTools = import.meta.env.DEV 
  ? lazy(() => import('@/widgets/dev-tools/ui/DevTools').then(m => ({ default: m.DevTools })))
  : () => null;
function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
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
