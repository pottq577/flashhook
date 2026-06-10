import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/landing/ui/LandingPage';
import DashboardPage from '@/pages/dashboard/ui/DashboardPage';
import NotFoundPage from '@/pages/not-found/ui/NotFoundPage';
import PrivacyPolicyPage from '@/pages/policy/ui/PrivacyPolicyPage';
import TermsPage from '@/pages/policy/ui/TermsPage';
import AboutPage from '@/pages/about/ui/AboutPage';
import ContactPage from '@/pages/about/ui/ContactPage';
import { QueryProvider } from './providers/QueryProvider';

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
