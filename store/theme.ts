import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeValue } from "@/types";
import { applyTheme } from "@/lib/theme";

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
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
