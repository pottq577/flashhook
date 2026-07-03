import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminStore } from "@/entities/admin";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { adminApi } from "@/entities/admin";
import styles from "./AdminLoginPage.module.css";

export const AdminLoginPage = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const setAdminToken = useAdminStore((state) => state.setAdminToken);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      setAdminToken(token.trim());
      await adminApi.getMetrics();

      const from = location.state?.from?.pathname || "/admin";
      navigate(from, { replace: true });
    } catch (err) {
      setAdminToken(null);
      if (err instanceof Error && err.message === "Authentication failed") {
        setError("인증에 실패했어요. 올바른 관리자 토큰을 입력해 주세요.");
      } else {
        setError(
          "네트워크 또는 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.loginCard}
      >
        <div className={styles.topGradient} />

        <div className={styles.iconWrapper}>
          <div className={styles.iconBox}>
            <Shield size={32} />
          </div>
        </div>

        <h1 className={styles.title}>관리자 인증</h1>
        <p className={styles.subtitle}>
          백오피스 접근을 위해 관리자 토큰을 입력해주세요.
        </p>

        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="X-Admin-Token"
            aria-label="관리자 토큰"
            aria-invalid={!!error}
            aria-describedby={error ? "admin-login-error" : undefined}
            className={styles.input}
          />

          {error ? (
            <motion.p
              id="admin-login-error"
              role="alert"
              aria-live="polite"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={styles.errorText}
            >
              {error}
            </motion.p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className={styles.submitBtn}
          >
            {isLoading ? (
              <div className={styles.spinner} />
            ) : (
              <>
                인증하기
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
