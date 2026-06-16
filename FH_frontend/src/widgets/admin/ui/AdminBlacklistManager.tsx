import { useState } from 'react';
import { useAdminBlacklist, useAddBlacklistMutation, useRemoveBlacklistMutation } from '@/entities/admin/api/useAdminQueries';
import { ShieldAlert, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './AdminWidgets.module.css';

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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>IP 블랙리스트 관리</h2>
          <ShieldAlert size={18} className={styles.iconDanger} />
        </div>
      </div>

      <form onSubmit={handleAdd} className={styles.formGroup}>
        <input
          type="text"
          value={ipInput}
          onChange={(e) => setIpInput(e.target.value)}
          placeholder="차단할 IP 주소를 입력하세요"
          className={styles.input}
        />
        <button
          type="submit"
          disabled={addMutation.isPending || !ipInput.trim()}
          className={styles.submitBtn}
        >
          <Plus size={18} />
          차단 추가
        </button>
      </form>

      <div>
        {isLoading ? (
          <div className={styles.emptyState}>목록을 불러오는 중...</div>
        ) : !ips || ips.length === 0 ? (
          <div className={styles.emptyState} style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
            현재 차단된 IP가 없습니다.
          </div>
        ) : (
          <div className={styles.ipGrid}>
            {ips.map((ip) => (
              <motion.div
                key={ip}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={styles.ipItem}
              >
                <span className={styles.ipText}>{ip}</span>
                <button
                  onClick={() => removeMutation.mutate(ip)}
                  disabled={removeMutation.isPending}
                  className={styles.ipDeleteBtn}
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
