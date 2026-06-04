"use client";

import { useRouter } from "next/navigation";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import type { ThemeValue } from "@/types";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: string }[] = [
  { value: "light", label: "浅色", icon: "☀️" },
  { value: "dark", label: "深色", icon: "🌙" },
  { value: "system", label: "跟随系统", icon: "⚙️" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const clearToken = useAuthStore((s) => s.clearToken);

  function handleClearToken() {
    clearToken();
    router.replace("/setup");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        设置
      </h1>

      {/* Theme section */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
          主题
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}
        >
          {THEME_OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors text-sm"
              style={{
                borderBottom:
                  idx < THEME_OPTIONS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                color: "var(--text-primary)",
                backgroundColor:
                  theme === opt.value ? "rgba(37, 99, 235, 0.08)" : "transparent",
              }}
              aria-pressed={theme === opt.value}
              aria-label={`主题：${opt.label}`}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true">{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
              {theme === opt.value && (
                <span style={{ color: "var(--accent)" }} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Account section */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
          账户
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}
        >
          <button
            type="button"
            onClick={handleClearToken}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm"
            style={{ color: "var(--status-error)" }}
            aria-label="清除 Token 并退出"
          >
            <span aria-hidden="true">🚪</span>
            <span>清除 Token 并退出</span>
          </button>
        </div>
      </section>

      {/* Version info */}
      <p className="text-xs text-center mt-8" style={{ color: "var(--text-tertiary)" }}>
        ScholarFlow v1.0.0
      </p>
    </div>
  );
}
