import React, { useEffect, useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useFocusTrap } from "../../shared/hooks/useFocusTrap";
import { useLatest } from "../../shared/hooks/useLatest";
import { LabelingCard } from "./LabelingCard";
import styles from "./legal.module.css";

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
}) => {
  const modalId = useId();
  const shouldReduceMotion = useReducedMotion();

  const [isActive, setIsActive] = useState(isOpen);
  if (isOpen && !isActive) {
    setIsActive(true);
  }

  const modalRef = useFocusTrap(isActive);

  const latestOnDecline = useLatest(onDecline);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") latestOnDecline.current();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, latestOnDecline]);

  return (
    <AnimatePresence onExitComplete={() => setIsActive(false)}>
      {isOpen ? (
        <div className={styles.modalOverlay} onClick={onDecline}>
          <motion.div
            ref={modalRef as React.RefObject<HTMLDivElement>}
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`consent-modal-title-${modalId}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`consent-modal-title-${modalId}`}
              className={styles.sectionTitle}
              style={{ marginTop: 0 }}
            >
              서비스 이용 동의
            </h2>
            <p className={styles.paragraph}>
              FlashHook Endpoint를 사용하려면 아래 약관에 동의해야 해요.
            </p>

            <LabelingCard />

            <ul className={styles.list}>
              <li className={styles.listItem}>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#3b82f6" }}
                >
                  이용약관
                </a>{" "}
                동의 (필수)
              </li>
              <li className={styles.listItem}>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#3b82f6" }}
                >
                  개인정보처리방침
                </a>{" "}
                동의 (필수)
              </li>
            </ul>
            <p className={styles.disclaimer}>
              이 서비스는 24시간 안에 모든 데이터를 지우는 테스트 도구예요.
              <br />
              데이터가 사라지거나 외부로 전송되는 것에 책임을 지지 않아요.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={onDecline}
                className={styles.button}
                style={{
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  border: "1px solid #4b5563",
                }}
              >
                닫기
              </button>
              <button onClick={onAccept} className={styles.button}>
                모두 동의하고 시작하기
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
