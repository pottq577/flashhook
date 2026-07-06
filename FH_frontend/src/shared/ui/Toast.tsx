import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from '@/shared/ui/Toast.module.css';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const shouldReduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div 
      className={styles.toast}
      role="status"
      aria-atomic="true"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.15, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, { offset, velocity }) => {
        if (Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 500) {
          onClose();
        }
      }}
    >
      <span className={styles.icon} aria-hidden="true">✨</span>
      {message}
    </motion.div>
  );
}

export default Toast;
