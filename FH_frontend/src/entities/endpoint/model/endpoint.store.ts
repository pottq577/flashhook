import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedEndpoint {
  id: string;
  createdAt: number;
  expiresAt: string;
}

interface EndpointStore {
  endpoints: SavedEndpoint[];
  addEndpoint: (id: string, expiresAt: string) => void;
  removeEndpoint: (id: string) => void;
  clearExpired: () => void;
}

export const useEndpointStore = create<EndpointStore>()(
  persist(
    (set) => ({
      endpoints: [],
      addEndpoint: (id, expiresAt) => {
        set((state) => {
          const filtered = state.endpoints.filter((e) => e.id !== id);
          return {
            endpoints: [
              { id, createdAt: Date.now(), expiresAt },
              ...filtered,
            ].slice(0, 5), // 최대 5개 유지
          };
        });
      },
      removeEndpoint: (id) => {
        set((state) => ({
          endpoints: state.endpoints.filter((e) => e.id !== id),
        }));
      },
      clearExpired: () => {
        const now = Date.now();
        set((state) => ({
          endpoints: state.endpoints.filter(
            (e) => new Date(e.expiresAt).getTime() > now,
          ),
        }));
      },
    }),
    {
      name: "flashhook-endpoints", // localStorage key
    },
  ),
);
