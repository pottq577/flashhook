import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 5;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, duration) => {
    const id = crypto.randomUUID();
    const calculatedDuration = duration ?? Math.max(1500, Math.min(message.length * 100, 4000));
    set((state) => {
      const newToasts = [...state.toasts, { id, message, duration: calculatedDuration }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
