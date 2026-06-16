import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { logger } from "@/shared/lib/logger";
import { QueryProvider } from "./providers/QueryProvider";
import { ToastContainer } from "@/shared/ui/ToastContainer";
import { CookieBanner } from "@/widgets/legal";

import LandingPage from "@/pages/landing/ui/LandingPage";

const withErrorCatch = <T,>(importFunc: () => Promise<T>) => {
  return importFunc().catch((err) => {
    logger.error("Failed to dynamically load chunk", err);
    throw new Error(
      "페이지를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해주세요.",
    );
  });
};

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
function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <main>
          <Suspense
            fallback={
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100vh",
                  color: "var(--text-secondary)",
                }}
              >
                로딩중…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/dashboard/:endpointId"
                element={<DashboardPage />}
              />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
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
