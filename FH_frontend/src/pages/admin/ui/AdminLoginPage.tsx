import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminApi } from '@/shared/api/adminApi';
import styles from './AdminLoginPage.module.css';

export const AdminLoginPage = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setAdminToken = useAdminStore(state => state.setAdminToken);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      setAdminToken(token.trim());
      await adminApi.getMetrics();
      
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch {
      setAdminToken(null);
      setError('인증에 실패했습니다. 올바른 관리자 토큰을 입력해주세요.');
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
            className={styles.input}
          />

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={styles.errorText}
            >
              {error}
            </motion.p>
          )}

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
