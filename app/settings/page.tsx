"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Moon, Monitor, LogOut, ChevronRight,
  Calendar, ClipboardList, Activity, Database,
  BarChart3, Trash2, Download,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { downloadActivityCSV, clearActivityData } from "@/lib/activity-tracker-v3";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { exportAssignmentsCSV, exportRunningCSV, buildWeekICS, downloadICS } from "@/lib/export";
import { getDB } from "@/lib/db";
import type { ThemeValue } from "@/types";

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

interface StudentInfo {
  studentId: string;
  gpa: string;
  totalCredits: number;
  courseCount: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const token = useAuthStore((s) => s.token);
  const clearToken = useAuthStore((s) => s.clearToken);
  const { data: scheduleData } = useScheduleQuery();
  const { assignments } = useAssignmentsQuery();
  const { records } = useRunningQuery();
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      getDB().cachedFiles.count().then(n => setCacheSize(n)).catch(() => setCacheSize(0));
      fetch("/api/local-data?type=student")
        .then(r => r.json())
        .then(d => { if (d?.studentId) setStudentInfo(d); })
        .catch(() => {});
    }
  }, [mounted]);

  const handleLogout = () => {
    if (confirm("确定要退出登录吗？")) {
      clearToken();
      router.replace("/setup");
    }
  };

  function handleExportICS() {
    if (!scheduleData?.schedule) return;
    const ics = buildWeekICS(scheduleData.schedule, new Date());
    downloadICS(ics, `schedule-${new Date().toISOString().slice(0, 10)}.ics`);
  }

  const currentThemeOption = THEME_OPTIONS.find(t => t.value === theme) || THEME_OPTIONS[2];

  // 用户名首字
  const avatarLetter = studentInfo?.studentId ? studentInfo.studentId[0] : "?";

  return (
    <div className="pb-24 md:pb-8 max-w-lg mx-auto">
      {/* ── Header ── */}
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>用户中心</h1>
      </div>

      {/* ── 用户卡片 ── */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.06 }}
        />

        <div className="relative flex items-center gap-4">
          {/* 头像 */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "'Noto Serif SC', Georgia, serif", fontSize: "22px", fontWeight: 700 }}
          >
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            {studentInfo ? (
              <>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {studentInfo.studentId}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                  <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>已同步教务系统</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>ScholarFlow 用户</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--text-muted)" }} />
                  <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>未同步教务系统</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {studentInfo && (
            <>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "#2d7a4f" }}>{studentInfo.gpa}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>GPA</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{studentInfo.totalCredits}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>学分</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{studentInfo.courseCount}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>课程</div>
              </div>
            </>
          )}
          {!studentInfo && (
            <>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{scheduleData?.schedule?.courses?.length ?? 0}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>课程</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{assignments.filter(a => !a.done).length}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>待办</div>
              </div>
            </>
          )}
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--surface)" }}>
            <div className="text-[16px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{records.length}</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>跑步</div>
          </div>
        </div>
      </div>

      {/* ── 外观 ── */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <currentThemeOption.Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>外观</span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ backgroundColor: "var(--surface)" }}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                style={{
                  backgroundColor: theme === opt.value ? "var(--surface-card)" : "transparent",
                  color: theme === opt.value ? "var(--accent)" : "var(--text-tertiary)",
                  boxShadow: theme === opt.value ? "var(--shadow-xs)" : "none",
                }}
                aria-pressed={theme === opt.value}
              >
                <opt.Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
                {theme === opt.value && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 数据导出 ── */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Download className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>数据导出</span>
        </div>
        <div className="pb-2">
          <MenuItem icon={Calendar} label="导出课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
          <MenuItem icon={ClipboardList} label="导出作业 (CSV)" onClick={() => exportAssignmentsCSV(assignments)} disabled={!assignments.length} />
          <MenuItem icon={Activity} label="导出跑步 (CSV)" onClick={() => exportRunningCSV(records)} disabled={!records.length} />
          <MenuItem icon={BarChart3} label="导出屏幕时间 (CSV)" onClick={downloadActivityCSV} />
          <MenuItem icon={Trash2} label="清除屏幕时间数据" onClick={() => { if (confirm("确定清除？")) clearActivityData(); }} danger last />
        </div>
      </div>

      {/* ── 缓存与存储 ── */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Database className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>缓存与存储</span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              IndexedDB: <span className="font-semibold tabular-nums">{cacheSize === null ? "--" : cacheSize}</span> 文件
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => getDB().cachedFiles.count().then(n => setCacheSize(n)).catch(() => {})} className="text-[11px] px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>刷新</button>
              <button onClick={() => { getDB().cachedFiles.clear(); getDB().mutationsQueue.clear(); setCacheSize(0); }} className="text-[11px] px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: "rgba(192,57,43,0.08)", color: "var(--status-error)" }}>清除</button>
            </div>
          </div>
          <div className="space-y-1.5 text-[11px] pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <InfoRow label="Token" value="安全加密存储" />
            <InfoRow label="课表/作业/跑步" value="GitHub → IndexedDB" />
            <InfoRow label="考试/主题/目标" value="localStorage" />
          </div>
        </div>
      </div>

      {/* ── 关于 ── */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
      >
        <div className="p-4 text-center">
          <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--accent)", fontFamily: "'Noto Serif SC', Georgia, serif" }}>ScholarFlow</div>
          <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>v1.2.0 · Electron + Next.js</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>统一学习管理中枢</div>
        </div>
      </div>

      {/* ── 退出 ── */}
      {token && (
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-[13px] font-medium transition-all mb-4"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--status-error)", boxShadow: "var(--shadow-xs)" }}
        >
          <LogOut className="w-4 h-4" />退出登录
        </button>
      )}
    </div>
  );
}

// ── 子组件 ──

function MenuItem({
  icon: Icon, label, onClick, disabled, danger, last,
}: {
  icon: typeof Sun; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        borderBottom: last ? "none" : "1px solid var(--border-subtle)",
        color: disabled ? "var(--text-muted)" : danger ? "var(--status-error)" : "var(--text-primary)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[13px]">{label}</span>
      {!disabled && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--text-muted)" }} />}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span className="text-right max-w-[60%]" style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}
