interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

import styles from './ConfirmModal.module.css';
import { motion, AnimatePresence } from 'framer-motion';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true">
          <motion.div 
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2>{title}</h2>
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
