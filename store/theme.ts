import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ThemeValue } from "@/types";
import { applyTheme } from "@/lib/theme";

const safeStorage = {
  getItem: (name: string) => typeof window !== 'undefined' ? window.localStorage.getItem(name) : null,
  setItem: (name: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(name, value); },
  removeItem: (name: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(name); },
};

interface ThemeState {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system" as ThemeValue,

      setTheme: (theme: ThemeValue) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: "sf_theme",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
