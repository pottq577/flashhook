import { create } from 'zustand';
import type { WebhookLog, WebhookLogDetail } from './log.schema';

interface LogState {
  logs: WebhookLog[];
  selectedLog: WebhookLogDetail | null;
  setLogs: (logs: WebhookLog[]) => void;
  addLog: (log: WebhookLog) => void;
  setSelectedLog: (log: WebhookLogDetail | null) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 500;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  selectedLog: null,
  setLogs: (logs) => set({ logs: logs.slice(0, MAX_LOGS) }),
  addLog: (log) => set((state) => {
    // Only add if it doesn't already exist to prevent duplicates from SSE
    if (state.logs.some(l => l.logId === log.logId)) return state;
    return { logs: [log, ...state.logs].slice(0, MAX_LOGS) };
  }),
  setSelectedLog: (selectedLog) => set({ selectedLog }),
  clearLogs: () => set({ logs: [], selectedLog: null }),
}));
