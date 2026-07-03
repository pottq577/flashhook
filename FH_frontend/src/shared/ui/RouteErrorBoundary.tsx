import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";
import { useLocation } from "react-router-dom";
import { logger } from "@/shared/lib/logger";

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "2rem",
        textAlign: "center",
        color: "var(--text-primary)",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>문제가 발생했어요</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", wordBreak: "break-all" }}>
        {import.meta.env.MODE === "development"
          ? error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다."
          : "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."}
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "var(--accent)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        다시 시도
      </button>
    </div>
  );
}

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => {
        logger.error("React Error Boundary Caught", error, info);
      }}
      // URL이 변경되면 에러 경계를 자동으로 리셋합니다.
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
}
