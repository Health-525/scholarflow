import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const safeStorage = {
  getItem: (name: string) => typeof window !== 'undefined' ? window.localStorage.getItem(name) : null,
  setItem: (name: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(name, value); },
  removeItem: (name: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(name); },
};

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },

      clearToken: () => {
        set({ token: null, isAuthenticated: false });
      },
    }),
    {
      name: "sf_auth",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
