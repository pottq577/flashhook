import {
  useAdminSuspiciousEndpoints,
  useDeleteEndpointMutation,
} from "@/entities/admin";
import { Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./AdminWidgets.module.css";
import { useState } from "react";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import { Skeleton } from "@/shared/ui/Skeleton";

export const AdminAbuserTable = () => {
  const { data, isLoading, isError } = useAdminSuspiciousEndpoints();
  const deleteMutation = useDeleteEndpointMutation();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingEndpointId, setPendingEndpointId] = useState<string | null>(null);

  const handleDeleteClick = (endpointId: string) => {
    setPendingEndpointId(endpointId);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingEndpointId) {
      deleteMutation.mutate(pendingEndpointId);
    }
    setIsConfirmOpen(false);
    setPendingEndpointId(null);
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
    setPendingEndpointId(null);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>과부하 의심 엔드포인트</h2>
          <span className={styles.badge}>Top 10</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>엔드포인트 ID</th>
              <th>라벨</th>
              <th>로그 수</th>
              <th>생성 IP</th>
              <th style={{ textAlign: "right" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton width="120px" /></td>
                    <td><Skeleton width="60px" /></td>
                    <td><Skeleton width="100px" /></td>
                    <td>
                      <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                        <Skeleton width="32px" height="32px" borderRadius="var(--radius-md)" />
                        <Skeleton width="32px" height="32px" borderRadius="var(--radius-md)" />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ) : isError ? (
              <tr>
                <td
                  colSpan={5}
                  className={styles.emptyState}
                  style={{ color: "var(--danger)" }}
                >
                  데이터를 불러오지 못했어요.
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  현재 탐지된 과부하 의심 엔드포인트가 없습니다.
                </td>
              </tr>
            ) : (
              data.map((endpoint, i) => (
                <motion.tr
                  key={endpoint.endpointId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td className={styles.fontMono}>
                    {endpoint.endpointId.slice(0, 8)}...
                  </td>
                  <td className={styles.textWhite}>{endpoint.label || "-"}</td>
                  <td>
                    <div className={styles.warningText}>
                      <AlertTriangle size={14} />
                      {endpoint.logCount.toLocaleString()}
                    </div>
                  </td>
                  <td className={styles.fontMono}>{endpoint.creatorIp}</td>
                  <td>
                    <div className={styles.actions}>
                      <a
                        href={`/dashboard/${endpoint.endpointId}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="새 탭에서 열기"
                        className={styles.actionBtn}
                        role="button"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => handleDeleteClick(endpoint.endpointId)}
                        disabled={deleteMutation.isPending}
                        aria-label="삭제"
                        className={`${styles.actionBtn} ${styles.danger}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="엔드포인트 삭제"
        message="이 엔드포인트를 즉시 삭제하시겠습니까?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
