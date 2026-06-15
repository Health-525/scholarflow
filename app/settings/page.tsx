"use client";

import {
  Sun, Moon, Monitor, LogOut, ChevronRight,
  Calendar, ClipboardList, Activity, Database,
  BarChart3, Trash2, Download, RefreshCw,
  GraduationCap, ShieldCheck, Clock, User,
  School, Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/ui/settings-section";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery, useRefreshData } from "@/hooks/useQueries";
import { downloadActivityCSV, clearActivityData } from "@/lib/activity-tracker-v3";
import { exportAssignmentsCSV, exportRunningCSV, buildWeekICS, downloadICS } from "@/lib/export";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { cn } from "@/lib/utils";
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
  const { schoolId, userId, username, clearToken } = useAuthStore((s) => s);
  const { data: scheduleData } = useScheduleQuery();
  const { assignments } = useAssignmentsQuery();
  const { records } = useRunningQuery();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  const refreshData = useRefreshData();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      fetch("/api/local-data?type=student")
        .then(r => r.json())
        .then(d => { if (d?.studentId) setStudentInfo(d); })
        .catch(() => {});
    }
  }, [mounted]);

  const handleLogout = () => {
    clearToken();
    router.replace("/setup");
  };

  function handleExportICS() {
    if (!scheduleData?.schedule) return;
    const ics = buildWeekICS(scheduleData.schedule, new Date());
    downloadICS(ics, `schedule-${new Date().toISOString().slice(0, 10)}.ics`);
  }

  const handleRefreshFromSchool = async () => {
    if (!schoolId || !username) {
      setFetchMessage("请先登录学校账号");
      return;
    }
    setFetchMessage(null);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const cookie = sessionData?.cookie || "";

      const result = await refreshData.mutateAsync({ schoolId, cookie, username });
      if (result.success) {
        setFetchMessage(`数据刷新成功：${result.fetched?.join("、") || "全部"}`);
      } else {
        setFetchMessage(`刷新失败：${result.error || "未知错误"}`);
      }
    } catch (e) {
      setFetchMessage(`刷新失败：${e instanceof Error ? e.message : "未知错误"}`);
    }
  };

  // ── Derived display values ──────────────────────────────────
  const displayName = studentInfo?.studentId || userId || username || "ScholarFlow 用户";
  const avatarLetter = displayName[0]?.toUpperCase() || "S";
  const schoolName = schoolId === "njtech" ? "南京工业大学" : schoolId || "未绑定";
  const isSynced = !!studentInfo?.studentId || !!schoolId;

  return (
    <div className="pb-20 md:pb-0 max-w-lg mx-auto animate-page">
      <PageHeader
        icon={<User className="w-5 h-5 text-primary" />}
        title="用户中心"
      />

      {/* ── 用户卡片 ──────────────────────────────────────────── */}
      <div className="card-glow rounded-[28px] p-6 mb-5 relative overflow-hidden bg-card border border-border shadow-sm animate-fade-up">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-primary/4 blur-2xl" />
        </div>

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-[22px] bg-primary/10 blur-xl" aria-hidden="true" />
            <div className="relative w-14 h-14 rounded-[22px] flex items-center justify-center bg-primary text-primary-foreground font-display text-[22px] font-bold shadow-sm">
              {avatarLetter}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold tabular-nums text-foreground truncate">
              {displayName}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSynced ? "bg-[var(--status-success)]" : "bg-muted-foreground/40"
              )} />
              <span className="text-[12px] text-muted-foreground">
                {isSynced ? "已同步教务系统" : "未同步教务系统"}
              </span>
            </div>
            {schoolId && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <School className="w-3 h-3 text-primary/60" />
                <span className="text-[11px] text-muted-foreground">{schoolName}</span>
              </div>
            )}
          </div>

          {/* Logout button — always visible */}
          <button
            onClick={handleLogout}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium",
              "transition-all cursor-pointer",
              "bg-destructive/8 border border-destructive/15 text-destructive",
              "hover:bg-destructive/15 hover:border-destructive/25",
              "active:translate-y-0.5"
            )}
            aria-label="退出登录"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {studentInfo ? (
            <>
              <StatChip value={studentInfo.gpa} label="GPA" accent />
              <StatChip value={String(studentInfo.totalCredits)} label="学分" />
              <StatChip value={String(studentInfo.courseCount)} label="课程" />
            </>
          ) : (
            <>
              <StatChip value={String(scheduleData?.schedule?.courses?.length ?? 0)} label="课程" />
              <StatChip value={String(assignments.filter(a => !a.done).length)} label="待办" />
            </>
          )}
          <StatChip value={String(records.length)} label="跑步" />
        </div>
      </div>

      {/* ── 外观 ──────────────────────────────────────────────── */}
      <SettingsSection icon={<Sun className="w-4 h-4" />} title="外观">
        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer",
                theme === opt.value
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={theme === opt.value}
            >
              <opt.Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
              {theme === opt.value && <span className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* ── 数据刷新 ──────────────────────────────────────────── */}
      <SettingsSection icon={<RefreshCw className="w-4 h-4" />} title="数据刷新">
        <p className="text-[11px] mb-3 text-muted-foreground">
          从学校教务系统重新抓取课表、成绩、考试等数据
        </p>
        {fetchMessage && (
          <div className={cn(
            "mb-3 px-3 py-2.5 rounded-xl text-[11px] animate-fade-up whitespace-pre-line",
            fetchMessage.includes("失败") || fetchMessage.includes("错误")
              ? "bg-destructive/8 border border-destructive/15 text-destructive"
              : "bg-[var(--status-success)]/8 border border-[var(--status-success)]/15 text-[var(--status-success)]"
          )}>
            {fetchMessage}
          </div>
        )}
        <button
          onClick={handleRefreshFromSchool}
          disabled={refreshData.isPending}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer",
            refreshData.isPending
              ? "bg-secondary text-muted-foreground opacity-60"
              : "bg-primary/10 text-primary hover:bg-primary/15 active:translate-y-0.5"
          )}
        >
          <RefreshCw className={cn("w-4 h-4 shrink-0", refreshData.isPending && "animate-spin")} />
          <span className="text-[13px] font-medium">
            {refreshData.isPending ? "刷新中..." : "从教务系统刷新数据"}
          </span>
          <span className="text-[10px] ml-auto text-muted-foreground">课表 · 成绩 · 考试</span>
        </button>
      </SettingsSection>

      {/* ── 数据导出 ──────────────────────────────────────────── */}
      <SettingsSection icon={<Download className="w-4 h-4" />} title="数据导出">
        <MenuItem icon={Calendar} label="导出课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
        <MenuItem icon={ClipboardList} label="导出作业 (CSV)" onClick={() => exportAssignmentsCSV(assignments)} disabled={!assignments.length} />
        <MenuItem icon={Activity} label="导出跑步 (CSV)" onClick={() => exportRunningCSV(records)} disabled={!records.length} />
        <MenuItem icon={BarChart3} label="导出屏幕时间 (CSV)" onClick={downloadActivityCSV} />
        <MenuItem icon={Trash2} label="清除屏幕时间数据" onClick={() => { if (confirm("确定清除？")) clearActivityData(); }} danger last />
      </SettingsSection>

      {/* ── 存储信息 ──────────────────────────────────────────── */}
      <SettingsSection icon={<Database className="w-4 h-4" />} title="存储信息">
        <div className="space-y-2 text-[11px]">
          <InfoRow icon={<ShieldCheck className="w-3 h-3" />} label="数据存储" value="SQLite 本地数据库" />
          <InfoRow icon={<Clock className="w-3 h-3" />} label="课表/作业/跑步" value="本地优先，自动持久化" />
          <InfoRow icon={<GraduationCap className="w-3 h-3" />} label="学校凭证" value="安全加密存储" />
        </div>
      </SettingsSection>

      {/* ── 关于 ──────────────────────────────────────────────── */}
      <SettingsSection icon={<Info className="w-4 h-4" />} title="关于">
        <div className="text-center">
          <div className="text-[14px] font-semibold mb-1 text-primary font-display">ScholarFlow</div>
          <div className="text-[11px] text-muted-foreground">v2.0 · Electron + Next.js</div>
          <div className="text-[10px] mt-0.5 text-muted-foreground">独立学习管理中枢</div>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">AI 助手</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--status-success)]/10 text-[var(--status-success)] font-medium">PWA</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium">离线优先</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-medium">SQLite</span>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">
            按 <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-secondary border border-border">?</kbd> 查看快捷键
          </div>
        </div>
      </SettingsSection>

      {/* ── 底部退出登录（大按钮，始终可见） ───────────────────── */}
      <button
        onClick={handleLogout}
        className={cn(
          "w-full rounded-[28px] p-4 flex items-center justify-center gap-2 text-[13px] font-medium",
          "transition-all cursor-pointer mb-6",
          "bg-card border border-destructive/15 text-destructive shadow-sm",
          "hover:bg-destructive/8 hover:border-destructive/25 hover:shadow-md",
          "active:translate-y-0.5"
        )}
      >
        <LogOut className="w-4 h-4" />
        退出登录
      </button>
    </div>
  );
}

// ── 子组件 ──────────────────────────────────────────────────────

function StatChip({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-2.5 text-center bg-secondary/60">
      <div className={cn(
        "text-[16px] font-semibold tabular-nums",
        accent ? "text-[var(--status-success)]" : "text-foreground"
      )}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, disabled, danger, last,
}: {
  icon: typeof Sun; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-3 text-left transition-colors cursor-pointer",
        !last && "border-b border-border",
        disabled && "text-muted-foreground opacity-50 cursor-default",
        danger && !disabled && "text-destructive",
        !danger && !disabled && "text-foreground hover:bg-secondary/40"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[13px]">{label}</span>
      {!disabled && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />}
    </button>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary/60 shrink-0">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right ml-auto text-foreground">{value}</span>
    </div>
  );
}
