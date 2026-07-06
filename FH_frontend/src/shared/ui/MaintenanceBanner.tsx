import styles from "@/shared/ui/MaintenanceBanner.module.css";

const IS_MAINTENANCE = import.meta.env.VITE_MAINTENANCE_MODE === "true";

export function MaintenanceBanner() {
  if (!IS_MAINTENANCE) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.icon}>⚙</span>
      <span className={styles.text}>
        서버 준비 중입니다.{" "}
        <span className={styles.highlight}>기능이 일시적으로 제한</span>될 수
        있어요.
      </span>
    </div>
  );
}
