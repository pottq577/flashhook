import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminApi } from '@/shared/api/adminApi';

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
      // 임시로 토큰 저장
      setAdminToken(token.trim());
      // metrics를 호출해서 토큰 검증
      await adminApi.getMetrics();
      
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch {
      // 검증 실패 시 토큰 제거
      setAdminToken(null);
      setError('인증에 실패했습니다. 올바른 관리자 토큰을 입력해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-[#1a1b1e] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
          
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
              <Shield size={32} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">관리자 인증</h1>
          <p className="text-gray-400 text-center text-sm mb-8">
            백오피스 접근을 위해 관리자 토큰을 입력해주세요.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="X-Admin-Token"
                className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading || !token.trim()}
              className="w-full bg-white hover:bg-gray-100 text-black disabled:opacity-50 font-semibold rounded-xl py-3.5 px-4 transition-colors flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  인증하기
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
