import { create } from 'zustand';

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
  addToast: (message, duration = 3000) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts = [...state.toasts, { id, message, duration }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
