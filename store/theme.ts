import { create } from "zustand";

import { applyTheme, getTheme, setTheme } from "@/lib/theme";
import type { ThemeValue } from "@/types";

interface ThemeState {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  // 客户端创建 store 时读取 localStorage；SSR 时 getTheme 返回 "system"
  theme: getTheme(),

  setTheme: (theme) => {
    set({ theme });
    setTheme(theme); // 持久化为纯字符串，与 layout 内联脚本格式一致
    applyTheme(theme);
  },
}));
