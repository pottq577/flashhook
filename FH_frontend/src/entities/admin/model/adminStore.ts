import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminState {
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      adminToken: null,
      setAdminToken: (token) => set({ adminToken: token }),
      logout: () => set({ adminToken: null }),
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
