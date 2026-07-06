import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useToastStore } from "@/shared/lib/toast.store";
import Toast from "@/shared/ui/Toast";
import styles from "@/shared/ui/ToastContainer.module.css";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const handleClose = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast],
  );

  return (
    <div className={styles.toastContainer} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            duration={toast.duration}
            onClose={() => handleClose(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
