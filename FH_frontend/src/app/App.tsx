import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { QueryProvider } from "./providers/QueryProvider";
const ToastContainer = lazy(() =>
  withErrorCatch(() =>
    import("@/shared/ui/ToastContainer").then((m) => ({
      default: m.ToastContainer,
    })),
  ),
);
import { CookieBanner } from "@/widgets/legal/CookieBanner";
import { MaintenanceBanner } from "@/shared/ui/MaintenanceBanner";

import LandingPage from "@/pages/landing/ui/LandingPage";

import { withErrorCatch } from "@/shared/lib/withErrorCatch";
import { RouteErrorBoundary } from "@/shared/ui/RouteErrorBoundary";
import { Skeleton } from "@/shared/ui/Skeleton";

const DashboardPage = lazy(() =>
  withErrorCatch(() => import("@/pages/dashboard/ui/DashboardPage")),
);
const NotFoundPage = lazy(() =>
  withErrorCatch(() => import("@/pages/not-found/ui/NotFoundPage")),
);
const PrivacyPolicyPage = lazy(() =>
  withErrorCatch(() =>
    import("@/pages/legal/PrivacyPolicyPage").then((module) => ({
      default: module.PrivacyPolicyPage,
    })),
  ),
);
const PrivacyPolicyEuPage = lazy(() =>
  withErrorCatch(() =>
    import("@/pages/legal/PrivacyPolicyEuPage").then((module) => ({
      default: module.PrivacyPolicyEuPage,
    })),
  ),
);
const TermsOfServicePage = lazy(() =>
  withErrorCatch(() =>
    import("@/pages/legal/TermsOfServicePage").then((module) => ({
      default: module.TermsOfServicePage,
    })),
  ),
);
const AboutPage = lazy(() =>
  withErrorCatch(() => import("@/pages/about/ui/AboutPage")),
);
const ContactPage = lazy(() =>
  withErrorCatch(() => import("@/pages/about/ui/ContactPage")),
);
const PublicSessionPage = lazy(() =>
  withErrorCatch(() => import("@/pages/session/ui/PublicSessionPage")),
);
const AdminLoginPage = lazy(() =>
  withErrorCatch(() =>
    import("@/pages/admin/ui/AdminLoginPage").then((module) => ({
      default: module.AdminLoginPage,
    })),
  ),
);
const AdminDashboardPage = lazy(() =>
  withErrorCatch(() =>
    import("@/pages/admin/ui/AdminDashboardPage").then((module) => ({
      default: module.AdminDashboardPage,
    })),
  ),
);
const RequireAdminAuth = lazy(() =>
  withErrorCatch(() =>
    import("@/features/admin/ui/RequireAdminAuth").then((module) => ({
      default: module.RequireAdminAuth,
    })),
  ),
);

// 개발 환경에서만 DevTools 번들 로드
const DevTools = import.meta.env.DEV
  ? lazy(() =>
      withErrorCatch(() =>
        import("@/widgets/dev-tools/ui/DevTools").then((m) => ({
          default: m.DevTools,
        })),
      ),
    )
  : () => null;

const AppLoadingFallback = (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: "4rem 2rem",
      backgroundColor: "var(--bg-primary)",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        width: "100%",
        maxWidth: "1200px",
      }}
    >
      <Skeleton width="100%" height="80px" />
      <Skeleton width="100%" height="400px" />
    </div>
  </div>
);

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <MaintenanceBanner />
        <main>
          <Suspense fallback={AppLoadingFallback}>
            <RouteErrorBoundary>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/dashboard/:endpointId"
                  element={<DashboardPage />}
                />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/privacy-eu" element={<PrivacyPolicyEuPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />

                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdminAuth>
                      <AdminDashboardPage />
                    </RequireAdminAuth>
                  }
                />
                <Route path="/session/:logId" element={<PublicSessionPage />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </RouteErrorBoundary>
          </Suspense>
        </main>
        <CookieBanner />
        <Suspense fallback={null}>
          <ToastContainer />
        </Suspense>
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
