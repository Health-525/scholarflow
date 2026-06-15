"use client";

import {
  Sun, Moon, Monitor, LogOut, ChevronRight,
  Calendar, ClipboardList, Activity, Database,
  BarChart3, Trash2, Download, RefreshCw,
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
  const { schoolId, username, clearToken } = useAuthStore((s) => s);
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

  const handleRefreshFromSchool = async () => {
    if (!schoolId || !username) {
      setFetchMessage("请先登录学校账号");
      return;
    }
    setFetchMessage(null);
    try {
      // Get cookie from auth store or session
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

  const avatarLetter = studentInfo?.studentId ? studentInfo.studentId[0] : username ? username[0] : "?";

  return (
    <div className="pb-20 md:pb-0 max-w-lg mx-auto animate-page">
      <PageHeader
        icon={
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.313.255-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.117.737.43.992l1.004.827c.424.35.534.955.26 1.43l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.312-.255.437-.613.43-.992a7.723 7.723 0 010-.255c.007-.38-.118-.737-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.331-.183.581-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        title="用户中心"
      />

      {/* 用户卡片 */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden bg-card border border-border shadow-sm">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none opacity-[0.06] bg-gradient-to-br from-primary to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-[serif] text-[22px] font-bold">
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            {studentInfo ? (
              <>
                <div className="text-[16px] font-semibold tabular-nums text-foreground">{studentInfo.studentId}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[12px] text-muted-foreground">已同步教务系统</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[16px] font-semibold text-foreground">{username || "ScholarFlow 用户"}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">未同步教务系统</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {studentInfo && (
            <>
              <StatChip value={studentInfo.gpa} label="GPA" accent />
              <StatChip value={String(studentInfo.totalCredits)} label="学分" />
              <StatChip value={String(studentInfo.courseCount)} label="课程" />
            </>
          )}
          {!studentInfo && (
            <>
              <StatChip value={String(scheduleData?.schedule?.courses?.length ?? 0)} label="课程" />
              <StatChip value={String(assignments.filter(a => !a.done).length)} label="待办" />
            </>
          )}
          <StatChip value={String(records.length)} label="跑步" />
        </div>
      </div>

      {/* 外观 */}
      <SettingsSection icon={<Sun className="w-4 h-4" />} title="外观">
        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                theme === opt.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
              aria-pressed={theme === opt.value}
            >
              <opt.Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
              {theme === opt.value && <span className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* 数据刷新 */}
      <SettingsSection icon={<RefreshCw className="w-4 h-4" />} title="数据刷新">
        <p className="text-[11px] mb-3 text-muted-foreground">
          从学校教务系统重新抓取课表、成绩、考试等数据
        </p>
        {fetchMessage && (
          <div className={`mb-3 px-3 py-2.5 rounded-xl text-[11px] animate-fade-up whitespace-pre-line ${
            fetchMessage.includes("失败") || fetchMessage.includes("错误") ? "bg-red-500/8 text-red-500" : "bg-green-500/8 text-green-600"
          }`}>
            {fetchMessage}
          </div>
        )}
        <button
          onClick={handleRefreshFromSchool}
          disabled={refreshData.isPending}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
            refreshData.isPending ? "bg-secondary text-muted-foreground opacity-60" : "bg-primary/10 text-primary"
          }`}
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${refreshData.isPending ? "animate-spin" : ""}`} />
          <span className="text-[13px] font-medium">{refreshData.isPending ? "刷新中..." : "从教务系统刷新数据"}</span>
          <span className="text-[10px] ml-auto text-muted-foreground">课表 · 成绩 · 考试</span>
        </button>
      </SettingsSection>

      {/* 数据导出 */}
      <SettingsSection icon={<Download className="w-4 h-4" />} title="数据导出">
        <MenuItem icon={Calendar} label="导出课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
        <MenuItem icon={ClipboardList} label="导出作业 (CSV)" onClick={() => exportAssignmentsCSV(assignments)} disabled={!assignments.length} />
        <MenuItem icon={Activity} label="导出跑步 (CSV)" onClick={() => exportRunningCSV(records)} disabled={!records.length} />
        <MenuItem icon={BarChart3} label="导出屏幕时间 (CSV)" onClick={downloadActivityCSV} />
        <MenuItem icon={Trash2} label="清除屏幕时间数据" onClick={() => { if (confirm("确定清除？")) clearActivityData(); }} danger last />
      </SettingsSection>

      {/* 存储信息 */}
      <SettingsSection icon={<Database className="w-4 h-4" />} title="存储信息">
        <div className="space-y-1.5 text-[11px]">
          <InfoRow label="数据存储" value="SQLite 本地数据库" />
          <InfoRow label="课表/作业/跑步" value="本地优先，自动持久化" />
          <InfoRow label="考试/主题/目标" value="localStorage" />
          <InfoRow label="学校凭证" value="安全加密存储" />
        </div>
      </SettingsSection>

      {/* 关于 */}
      <SettingsSection icon={<SchoolIcon />} title="关于">
        <div className="text-center">
          <div className="text-[14px] font-semibold mb-1 text-primary font-[serif]">ScholarFlow</div>
          <div className="text-[11px] text-muted-foreground">v2.0 · Electron + Next.js</div>
          <div className="text-[10px] mt-0.5 text-muted-foreground">独立学习管理中枢</div>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">AI 助手</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 font-medium">PWA</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium">离线优先</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-medium">SQLite 存储</span>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">
            按 <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-secondary border border-border">?</kbd> 查看快捷键
          </div>
        </div>
      </SettingsSection>

      {/* 退出 */}
      {schoolId && (
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-[13px] font-medium transition-all mb-4 bg-card border border-border text-red-500 shadow-sm"
        >
          <LogOut className="w-4 h-4" />退出登录
        </button>
      )}
    </div>
  );
}

// ── 子组件 ──

function StatChip({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-2.5 text-center bg-secondary">
      <div className={`text-[16px] font-semibold tabular-nums ${accent ? "text-green-700" : "text-foreground"}`}>{value}</div>
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
      className={`w-full flex items-center gap-3 px-2 py-3 text-left transition-colors ${
        !last ? "border-b border-border" : ""
      } ${disabled ? "text-muted-foreground opacity-50" : danger ? "text-red-500" : "text-foreground"}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[13px]">{label}</span>
      {!disabled && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right max-w-[60%] text-foreground">{value}</span>
    </div>
  );
}

function SchoolIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.5M4 21V8.5l8-5 8 5V21M4 8.5l8 5 8-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5l3-2 3 2" />
    </svg>
  );
}
