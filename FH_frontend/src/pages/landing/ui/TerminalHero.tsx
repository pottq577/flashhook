import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css";

interface TerminalHeroProps {
  terminalLines: string[];
  isLoading: boolean;
  error: string | null;
  endpoints: Array<{ id: string; createdAt: number }>;
  now: number;
  onCreateClick: () => void;
  onDeleteClick: (id: string) => void;
}

export function TerminalHero({
  terminalLines,
  isLoading,
  error,
  endpoints,
  now,
  onCreateClick,
  onDeleteClick,
}: TerminalHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.terminalContainer}>
        <div className={styles.terminalHeader}>
          <div className={styles.macButtons}>
            <span className={styles.close}></span>
            <span className={styles.minimize}></span>
            <span className={styles.maximize}></span>
          </div>
          <div className={styles.terminalTitle}>bash - flashhook</div>
        </div>
        <div className={styles.terminalBody}>
          {terminalLines.map((line, index) => (
            <div
              key={index}
              className={
                line.startsWith("$") ? styles.commandLine : styles.outputLine
              }
            >
              {line}
            </div>
          ))}
          {!isLoading ? (
            <div className={styles.activeLine}>
              <span className={styles.prompt}>$</span>
              <span className={styles.cursor}></span>
            </div>
          ) : null}
        </div>

        <div className={styles.terminalActions}>
          <h1 className={styles.title}>FlashHook</h1>
          <p className={styles.subtitle}>
            회원가입 없이 1초 만에 웹훅을 받아보고 테스트할 수 있어요.
          </p>

          <button
            className={styles.button}
            onClick={onCreateClick}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? "[ CREATING… ]" : "[ CREATE_NEW_ENDPOINT ]"}
          </button>

          {error ? (
            <div className={styles.errorBox} role="alert">
              Error: {error}
            </div>
          ) : null}

          {endpoints.length > 0 ? (
            <div className={styles.recentEndpoints}>
              <div className={styles.recentTitle}>&gt; RECENT_SESSIONS</div>
              <div className={styles.recentList}>
                {endpoints.map((ep) => {
                  const diffMins = Math.max(
                    0,
                    Math.floor((now - ep.createdAt) / 60000),
                  );
                  const timeStr =
                    diffMins < 60
                      ? `${diffMins}분 전`
                      : `${Math.floor(diffMins / 60)}시간 전`;
                  const shortId = ep.id.substring(0, 8);

                  return (
                    <div key={ep.id} className={styles.recentItemWrapper}>
                      <Link
                        to={`/dashboard/${encodeURIComponent(ep.id)}`}
                        className={styles.recentItem}
                      >
                        <span className={styles.recentPrefix}>$ resume</span>
                        <span className={styles.recentId}>{shortId}</span>
                        <span className={styles.recentTime}>[{timeStr}]</span>
                      </Link>
                      <button
                        className={styles.recentRemove}
                        onClick={() => onDeleteClick(ep.id)}
                        title="기록 삭제"
                        aria-label="기록 삭제"
                      >
                        [✕]
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
