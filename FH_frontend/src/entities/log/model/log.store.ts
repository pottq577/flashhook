import { create } from "zustand";
import type { WebhookLog, WebhookLogDetail } from "@/entities/log/model/log.schema";

interface LogState {
  endpointId: string | null;
  logs: WebhookLog[];
  logMap: Record<string, WebhookLog>;
  selectedLog: WebhookLogDetail | null;
  setEndpointId: (endpointId: string) => void;
  setLogs: (logs: WebhookLog[]) => void;
  addLog: (log: WebhookLog) => void;
  setSelectedLog: (log: WebhookLogDetail | null) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 500;

export const useLogStore = create<LogState>((set, get) => ({
  endpointId: null,
  logs: [],
  logMap: {},
  selectedLog: null,
  setEndpointId: (endpointId) => {
    if (get().endpointId !== endpointId) {
      set({ endpointId, logs: [], logMap: {}, selectedLog: null });
    }
  },
  setLogs: (logs) => {
    const limitedLogs = logs.slice(0, MAX_LOGS);
    const logMap: Record<string, WebhookLog> = {};
    for (const l of limitedLogs) logMap[l.logId] = l;
    set({ logs: limitedLogs, logMap });
  },
  addLog: (log) =>
    set((state) => {
      if (state.logMap[log.logId]) return state;

      const newLogs = [log];
      for (let i = 0; i < Math.min(state.logs.length, MAX_LOGS - 1); i++) {
        newLogs.push(state.logs[i]);
      }

      const newLogMap = { ...state.logMap, [log.logId]: log };
      if (state.logs.length >= MAX_LOGS) {
        for (let i = MAX_LOGS - 1; i < state.logs.length; i++) {
          delete newLogMap[state.logs[i].logId];
        }
      }

      return { logs: newLogs, logMap: newLogMap };
    }),
  setSelectedLog: (selectedLog) => set({ selectedLog }),
  clearLogs: () => set({ logs: [], logMap: {}, selectedLog: null }),
}));
