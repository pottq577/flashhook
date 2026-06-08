import { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

function Toast({ message, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={styles.toastContainer}>
      <motion.div 
        className={styles.toast}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <span className={styles.icon}>✨</span>
        {message}
      </motion.div>
    </div>
  );
}

export default Toast;
