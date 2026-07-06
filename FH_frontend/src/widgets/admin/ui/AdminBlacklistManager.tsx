import type { FormEvent } from "react";
import { useState } from "react";
import {
  useAdminBlacklist,
  useAddBlacklistMutation,
  useRemoveBlacklistMutation,
} from "@/entities/admin";
import { ShieldAlert, Trash2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./AdminWidgets.module.css";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import { Skeleton } from "@/shared/ui/Skeleton";

export const AdminBlacklistManager = () => {
  const { data: ips, isLoading, isError } = useAdminBlacklist();
  const addMutation = useAddBlacklistMutation();
  const removeMutation = useRemoveBlacklistMutation();

  const [ipInput, setIpInput] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingIp, setPendingIp] = useState<string | null>(null);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;
    addMutation.mutate(ipInput.trim(), {
      onSuccess: () => setIpInput(""),
    });
  };

  const handleDeleteClick = (ip: string) => {
    setPendingIp(ip);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingIp) {
      removeMutation.mutate(pendingIp);
    }
    setIsConfirmOpen(false);
    setPendingIp(null);
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
    setPendingIp(null);
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
          aria-label="IP 주소 입력"
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
          <div className={styles.ipGrid}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.ipItem}>
                <Skeleton width="120px" />
                <Skeleton
                  width="32px"
                  height="32px"
                  borderRadius="var(--radius-md)"
                />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className={styles.emptyState} style={{ color: "var(--danger)" }}>
            데이터를 불러오지 못했어요.
          </div>
        ) : !ips || ips.length === 0 ? (
          <div
            className={styles.emptyState}
            style={{
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
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
                  onClick={() => handleDeleteClick(ip)}
                  disabled={removeMutation.isPending}
                  aria-label="삭제"
                  className={styles.ipDeleteBtn}
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="IP 차단 해제"
        message="이 IP의 차단을 해제하시겠습니까?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
