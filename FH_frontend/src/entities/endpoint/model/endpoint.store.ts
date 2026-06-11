import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedEndpoint {
  id: string;
  createdAt: number;
}

interface EndpointStore {
  endpoints: SavedEndpoint[];
  addEndpoint: (id: string) => void;
  removeEndpoint: (id: string) => void;
  clearExpired: () => void;
}

export const useEndpointStore = create<EndpointStore>()(
  persist(
    (set) => ({
      endpoints: [],
      addEndpoint: (id) => {
        set((state) => {
          const filtered = state.endpoints.filter((e) => e.id !== id);
          return {
            endpoints: [{ id, createdAt: Date.now() }, ...filtered].slice(0, 5), // 최대 5개 유지
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
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        set((state) => ({
          endpoints: state.endpoints.filter((e) => now - e.createdAt < TWENTY_FOUR_HOURS),
        }));
      },
    }),
    {
      name: 'flashhook-endpoints', // localStorage key
    }
  )
);
