import styles from "./PromptModal.module.css";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState, useRef, useEffectEvent } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function PromptModal({
  isOpen,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const modalId = useId();
  const shouldReduceMotion = useReducedMotion();

  const [isActive, setIsActive] = useState(isOpen);
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isOpen && !isActive) {
    setIsActive(true);
    setInputValue(defaultValue); // Reset to default when opening
  }

  const modalRef = useFocusTrap(isActive);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small timeout to allow animation and focus trap to settle
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCancel = useEffectEvent(onCancel);
  const handleConfirm = useEffectEvent(onConfirm);
  const handleInputValue = useEffectEvent(() => inputValue);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        const isButton = target?.tagName === "BUTTON";
        if (isButton) return;
        e.preventDefault();
        handleConfirm(handleInputValue());
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <AnimatePresence onExitComplete={() => setIsActive(false)}>
      {isOpen ? (
        <div className={styles.overlay} onClick={onCancel}>
          <motion.div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`prompt-modal-title-${modalId}`}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id={`prompt-modal-title-${modalId}`}>{title}</h2>
            </div>
            <div className={styles.content}>
              <p>{message}</p>
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                aria-label={title}
              />
            </div>
            <div className={styles.actions}>
              <button className={styles.btnCancel} onClick={onCancel}>
                {cancelText}
              </button>
              <button
                className={styles.btnConfirm}
                onClick={() => onConfirm(inputValue)}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default PromptModal;
