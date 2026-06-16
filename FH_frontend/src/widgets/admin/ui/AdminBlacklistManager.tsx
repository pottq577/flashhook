import { useState } from 'react';
import { useAdminBlacklist, useAddBlacklistMutation, useRemoveBlacklistMutation } from '@/entities/admin/api/useAdminQueries';
import { ShieldAlert, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminBlacklistManager = () => {
  const { data: ips, isLoading } = useAdminBlacklist();
  const addMutation = useAddBlacklistMutation();
  const removeMutation = useRemoveBlacklistMutation();
  
  const [ipInput, setIpInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;
    addMutation.mutate(ipInput.trim(), {
      onSuccess: () => setIpInput(''),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-white">IP 블랙리스트 관리</h2>
        <ShieldAlert size={18} className="text-red-400" />
      </div>

      <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-6">
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="차단할 IP 주소를 입력하세요 (예: 192.168.0.1)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono text-sm"
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !ipInput.trim()}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            차단 추가
          </button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500 text-sm">목록을 불러오는 중...</div>
          ) : !ips || ips.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
              현재 차단된 IP가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ips.map((ip) => (
                <motion.div
                  key={ip}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl group"
                >
                  <span className="font-mono text-sm text-red-200">{ip}</span>
                  <button
                    onClick={() => removeMutation.mutate(ip)}
                    disabled={removeMutation.isPending}
                    className="p-1.5 text-red-400/50 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
