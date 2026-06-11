interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

import styles from './ConfirmModal.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onCancel}>
          <motion.div 
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="confirm-modal-title">{title}</h2>
            </div>
            <div className={styles.content}>
              <p>{message}</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.btnCancel} onClick={onCancel}>취소</button>
              <button className={styles.btnConfirm} onClick={onConfirm}>확인</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmModal;
