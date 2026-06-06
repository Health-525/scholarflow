"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { ThemeValue } from "@/lib/theme";

const THEMES: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "亮色", Icon: Sun },
  { value: "dark", label: "暗色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const cycleTheme = () => {
    const idx = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.value);
  };

  const current = THEMES.find((t) => t.value === theme);
  const Icon = current?.Icon ?? Sun;

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 w-full text-left"
      style={{ color: "var(--text-tertiary)" }}
      aria-label={`切换主题，当前: ${current?.label}`}
      title={`当前: ${current?.label}`}
    >
      <Icon className="shrink-0 w-4 h-4" aria-hidden="true" />
      <span className="tracking-wide">{current?.label}</span>
    </button>
  );
}
