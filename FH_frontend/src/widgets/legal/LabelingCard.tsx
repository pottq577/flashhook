import styles from "./legal.module.css";

export const LabelingCard = () => {
  return (
    <div className={`${styles.highlightBox} ${styles.securityCard}`}>
      <div className={styles.securityIcon} aria-hidden="true">
        🔒
      </div>
      <div>
        <h3 className={styles.securityTitle}>데이터 보안 약속</h3>
        <p className={styles.securityDesc}>
          FlashHook이 받은 모든 로그 데이터는 암호화해서 전송하고, 만든 지{" "}
          <strong>24시간이 지나면 서버에서 완전히 지워요</strong>.
        </p>
      </div>
    </div>
  );
};
