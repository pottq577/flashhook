import styles from "@/pages/landing/ui/LandingPage.module.css";

export function LandingFeatures() {
  return (
    <section className={styles.section}>
      <div className={styles.splitContent}>
        <div className={styles.textContent}>
          <h2 className={styles.sectionTitle}>01. Instant Setup</h2>
          <p className={styles.textBody}>
            불필요한 가입 절차나 CLI 설치 없이 바로 쓸 수 있어요. 임시 URL을
            발급받고 터미널로 돌아가세요.
          </p>
        </div>
        <div className={styles.codeBlock}>
          <code>
            <span className={styles.keyword}>curl</span> -X POST \<br />
            &nbsp;&nbsp;https://api.flashhook.site/api/hooks/e/
            <span className={styles.variable}>YOUR_ID</span> \<br />
            &nbsp;&nbsp;-H{" "}
            <span className={styles.string}>
              "Content-Type: application/json"
            </span>{" "}
            \<br />
            &nbsp;&nbsp;-d{" "}
            <span className={styles.string}>
              '{"{"}"event": "payment.success"{"}"}'
            </span>
          </code>
        </div>
      </div>

      <div className={styles.splitContent}>
        <div className={styles.codeBlock} style={{ whiteSpace: "pre-wrap" }}>
          <code>
            <span className={styles.comment}>
              // Real-time incoming payload
            </span>
            {"\n{\n  "}
            <span className={styles.key}>"method"</span>:{" "}
            <span className={styles.string}>"POST"</span>,{"\n  "}
            <span className={styles.key}>"headers"</span>: {"{\n    "}
            <span className={styles.key}>"content-type"</span>:{" "}
            <span className={styles.string}>"application/json"</span>
            {"\n  },\n  "}
            <span className={styles.key}>"body"</span>: {"{\n    "}
            <span className={styles.key}>"event"</span>:{" "}
            <span className={styles.string}>"payment.success"</span>
            {"\n  }\n}"}
          </code>
        </div>
        <div className={styles.textContent}>
          <h2 className={styles.sectionTitle}>02. Real-time Inspection</h2>
          <p className={styles.textBody}>
            대시보드에서 실시간으로 웹훅 내용을 확인할 수 있어요. 남은 로그는
            24시간 뒤에 안전하게 모두 지울게요.
          </p>
        </div>
      </div>
    </section>
  );
}
