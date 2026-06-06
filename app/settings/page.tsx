"use client";

import { useRouter } from "next/navigation";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { downloadActivityCSV, clearActivityData } from "@/lib/activity-tracker-v3";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { exportAssignmentsCSV, exportRunningCSV, buildWeekICS, downloadICS } from "@/lib/export";
import type { ThemeValue } from "@/types";
import { getDB } from "@/lib/db";
import { useState } from "react";

import {
  Sun, Moon, Monitor, Calendar, ClipboardList, Activity,
  Database, LogOut, BarChart3, Trash2,
} from "lucide-react";

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const clearToken = useAuthStore((s) => s.clearToken);
  const token = useAuthStore((s) => s.token);
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
                backgroundColor: theme === opt.value ? "var(--accent-soft)" : "transparent",
              }}
              aria-pressed={theme === opt.value}
            >
              <span className="flex items-center gap-3">
                <opt.Icon className="w-4 h-4" aria-hidden="true" />
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
          <ActionRow Icon={Calendar} label="导出本周课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
          <ActionRow Icon={ClipboardList} label="导出作业 (CSV)" onClick={handleExportAssignments} disabled={!assignments.length} />
          <ActionRow Icon={Activity} label="导出跑步记录 (CSV)" onClick={handleExportRunning} disabled={!records.length} />
        </div>
      </SettingSection>

      {/* Screen time */}
      <SettingSection title="屏幕使用">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          <ActionRow Icon={BarChart3} label="查看详细分析" onClick={() => router.push("/activity")} />
          <button
            type="button"
            onClick={downloadActivityCSV}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm border-b transition-colors"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <Database className="w-4 h-4" />
            <span>导出屏幕时间 (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => { if (confirm("确定清除？")) clearActivityData(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
            style={{ color: "var(--text-danger, #ef4444)" }}
          >
            <Trash2 className="w-4 h-4" />
            <span>清除所有数据</span>
          </button>
        </div>
      </SettingSection>

      {/* Cache */}
      <SettingSection title="离线缓存">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
              <span className="flex items-center gap-3">
                <Database className="w-4 h-4" aria-hidden="true" />
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

      {/* ── 用户中心 ── */}
      <SettingSection title="用户中心">
        <div className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-elevated)" }}>
          {/* Token 状态 */}
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>GitHub Token</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[13px] font-mono" style={{ color: "var(--text-primary)" }}>
                {token ? `${token.slice(0,4)}...${token.slice(-4)}` : "未配置"}
              </span>
            </span>
          </div>

          {/* 数据存储概览 */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>数据存储位置</div>
            <div className="space-y-1.5 text-[11px]">
              <StorageRow label="Token" value="Electron 安全加密 / localStorage" />
              <StorageRow label="屏幕时间" value={`localStorage (${localStorage.getItem("sf_activity_v3") ? "有数据" : "空"})`} />
              <StorageRow label="课表/作业/跑步" value={`GitHub → IndexedDB 缓存 (${cacheSize !== null ? cacheSize + "文件" : "?"})`} />
              <StorageRow label="考试/目标/主题" value="localStorage" />
            </div>
          </div>

          {/* GitHub 联动 */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>GitHub 联动</div>
            <div className="space-y-1.5 text-[11px]">
              <StorageRow label="内容仓库" value="Health-525/jiangshu-study (笔记/日报/周报)" />
              <StorageRow label="执行仓库" value="Health-525/timetable (课表/作业/跑步数据)" />
              <StorageRow label="同步方式" value="GitHub API → 3层缓存 (内存/IndexedDB/API)" />
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="flex gap-2 pt-2">
            <button onClick={handleCheckCache} className="flex-1 py-2 rounded-lg text-[11px] font-medium" style={{ backgroundColor: "var(--surface)", color: "var(--accent)" }}>
              刷新缓存
            </button>
            <button onClick={handleClearCache} className="flex-1 py-2 rounded-lg text-[11px] font-medium" style={{ backgroundColor: "var(--surface)", color: "var(--status-error)" }}>
              清除缓存
            </button>
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
            <LogOut className="w-4 h-4" aria-hidden="true" />
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
  Icon,
  label,
  onClick,
  disabled,
}: {
  Icon: typeof Sun;
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
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function StorageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span className="text-right max-w-[60%]" style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}
