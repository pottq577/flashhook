import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/landing/ui/LandingPage';
import DashboardPage from '../pages/dashboard/ui/DashboardPage';
import NotFoundPage from '../pages/not-found/ui/NotFoundPage';
import { QueryProvider } from './providers/QueryProvider';

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
