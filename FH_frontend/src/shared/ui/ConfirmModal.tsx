import styles from "./ConfirmModal.module.css";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useLatest } from "../hooks/useLatest";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalId = useId();
  const shouldReduceMotion = useReducedMotion();

  const [isActive, setIsActive] = useState(isOpen);
  if (isOpen && !isActive) {
    setIsActive(true);
  }

  const modalRef = useFocusTrap(isActive);

  const latestOnCancel = useLatest(onCancel);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") latestOnCancel.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, latestOnCancel]);

  return (
    <AnimatePresence onExitComplete={() => setIsActive(false)}>
      {isOpen ? (
        <div className={styles.overlay} onClick={onCancel}>
          <motion.div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-modal-title-${modalId}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id={`confirm-modal-title-${modalId}`}>{title}</h2>
            </div>
            <div className={styles.content}>
              <p>{message}</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.btnCancel} onClick={onCancel}>
                닫기
              </button>
              <button className={styles.btnConfirm} onClick={onConfirm}>
                확인
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default ConfirmModal;
