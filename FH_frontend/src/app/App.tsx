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
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
