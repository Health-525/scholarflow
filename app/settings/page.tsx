"use client";

import { useRouter } from "next/navigation";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { exportAssignmentsCSV, exportRunningCSV, buildWeekICS, downloadICS } from "@/lib/export";
import type { ThemeValue } from "@/types";
import { getDB } from "@/lib/db";
import { useState } from "react";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: string }[] = [
  { value: "light", label: "浅色", icon: "☀️" },
  { value: "dark", label: "深色", icon: "🌙" },
  { value: "system", label: "跟随系统", icon: "⚙️" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const clearToken = useAuthStore((s) => s.clearToken);
  const { data: scheduleData } = useScheduleQuery();
  const { assignments } = useAssignmentsQuery();
  const { records } = useRunningQuery();
  const [cacheSize, setCacheSize] = useState<number | null>(null);

  async function handleClearToken() {
    clearToken();
    router.replace("/setup");
  }

  async function handleCheckCache() {
    try {
      const db = getDB();
      const count = await db.cachedFiles.count();
      setCacheSize(count);
    } catch {
      setCacheSize(-1);
    }
  }

  async function handleClearCache() {
    try {
      const db = getDB();
      await db.cachedFiles.clear();
      await db.mutationsQueue.clear();
      setCacheSize(0);
    } catch {
      // ignore
    }
  }

  function handleExportICS() {
    if (!scheduleData?.schedule) return;
    const ics = buildWeekICS(scheduleData.schedule, new Date());
    downloadICS(ics, `schedule-${new Date().toISOString().slice(0, 10)}.ics`);
  }

  function handleExportAssignments() {
    exportAssignmentsCSV(assignments);
  }

  function handleExportRunning() {
    exportRunningCSV(records);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        设置
      </h1>

      {/* Theme section */}
      <SettingSection title="主题">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          {THEME_OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors text-sm"
              style={{
                borderBottom: idx < THEME_OPTIONS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                color: "var(--text-primary)",
                backgroundColor: theme === opt.value ? "rgba(37, 99, 235, 0.08)" : "transparent",
              }}
              aria-pressed={theme === opt.value}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true">{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
              {theme === opt.value && <span style={{ color: "var(--accent)" }}>✓</span>}
            </button>
          ))}
        </div>
      </SettingSection>

      {/* Data export */}
      <SettingSection title="数据导出">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          <ActionRow icon="📅" label="导出本周课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
          <ActionRow icon="📋" label="导出作业 (CSV)" onClick={handleExportAssignments} disabled={!assignments.length} />
          <ActionRow icon="🏃" label="导出跑步记录 (CSV)" onClick={handleExportRunning} disabled={!records.length} />
        </div>
      </SettingSection>

      {/* Cache */}
      <SettingSection title="离线缓存">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
            <span className="flex items-center gap-3">
              <span aria-hidden="true">💾</span>
              <span>缓存文件数: {cacheSize === null ? "点击查看" : cacheSize}</span>
            </span>
            <span className="flex gap-2">
              <button onClick={handleCheckCache} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--surface)", color: "var(--accent)" }}>
                刷新
              </button>
              <button onClick={handleClearCache} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--surface)", color: "var(--status-error)" }}>
                清除
              </button>
            </span>
          </div>
        </div>
      </SettingSection>

      {/* Account */}
      <SettingSection title="账户">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
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
      </SettingSection>

      {/* Info */}
      <p className="text-xs text-center mt-8 space-y-1" style={{ color: "var(--text-tertiary)" }}>
        <span>ScholarFlow v1.0.0 · Phase 1-4</span><br />
        <span>Electron + Next.js · TanStack Query · Ollama AI</span>
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 transition-colors"
      style={{
        borderColor: "var(--border-subtle)",
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
