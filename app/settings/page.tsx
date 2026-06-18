"use client";

import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronRight,
  Calendar,
  ClipboardList,
  Activity,
  Database,
  BarChart3,
  Trash2,
  Download,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  Clock,
  User,
  School,
  Info,
  KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SettingsSection } from "@/components/ui/settings-section";
import { showToast } from "@/components/ui/ToastContainer";
import {
  useScheduleQuery,
  useAssignmentsQuery,
  useRunningQuery,
  useRefreshData,
} from "@/hooks/useQueries";
import {
  downloadActivityCSV,
  clearActivityData,
} from "@/lib/activity-tracker-v3";
import {
  exportAssignmentsCSV,
  exportRunningCSV,
  buildWeekICS,
  downloadICS,
} from "@/lib/export";
import { isElectron } from "@/lib/runtime-env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import type { ThemeValue } from "@/types";

interface ConfirmState {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  action: () => void;
}

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] =
  [
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
  const [showClearPassword, setShowClearPassword] = useState(false);
  const [clearingPassword, setClearingPassword] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const refreshData = useRefreshData();

  useEffect(() => {
    setMounted(true);
    setShowClearPassword(isElectron());
  }, []);

  // 复用的学生信息(GPA/学分/课程)加载器,刷新成功后可再次调用以更新卡片。
  const loadStudentInfo = useCallback(() => {
    const sid = schoolId || "njtech";
    const uid = userId || username || "default";
    fetch(`/api/local-data?type=student&schoolId=${sid}&userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.studentId) setStudentInfo(d);
      })
      .catch(() => {});
  }, [schoolId, userId, username]);

  useEffect(() => {
    if (mounted) loadStudentInfo();
  }, [mounted, loadStudentInfo]);

  // 通过 Secure_Storage 删除已记住的加密密码（Electron 专用，Web 形态为 no-op）。
  const clearRememberedCredential = async () => {
    try {
      await window.electronAPI?.clearCredential?.();
    } catch {
      // 加密存储不可用 / IPC 缺失时静默忽略，不阻断主流程。
    }
  };

  const handleLogout = async () => {
    // 1. Call logout API to clear credentials from DB（并关闭记住密码偏好）
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: schoolId || "njtech",
          userId: userId || username || "default",
        }),
      });
    } catch {}
    // 2. 清除已记住的加密密码（Req 4.4）
    await clearRememberedCredential();
    // 3. Clear Zustand auth state
    clearToken();
    // 4. Navigate to setup page
    router.replace("/setup");
  };

  // 退出登录 — 经二次确认(破坏性操作,清凭证并跳转登录页)。
  const confirmLogout = () => {
    setConfirmState({
      title: "退出登录",
      description:
        "将清除本地登录凭证并返回登录页。已同步的课表、成绩等本地数据会保留。",
      confirmText: "退出登录",
      danger: true,
      action: handleLogout,
    });
  };

  // 「清除已记住的密码」控件：删除加密密码并将偏好开关置为关闭（Req 4.1/4.2/4.3）。
  const handleClearPassword = async () => {
    setClearingPassword(true);
    await clearRememberedCredential();
    try {
      await fetch("/api/auth/remember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: schoolId || "njtech",
          userId: userId || username || "default",
        }),
      });
    } catch {}
    setClearingPassword(false);
    showToast("success", "已清除记住的密码");
  };

  const confirmClearPassword = () => {
    setConfirmState({
      title: "清除已记住的密码",
      description: "清除后自动刷新将停止,下次需要手动重新登录。",
      confirmText: "清除",
      danger: true,
      action: handleClearPassword,
    });
  };

  const confirmClearActivity = () => {
    setConfirmState({
      title: "清除屏幕时间数据",
      description: "将永久删除本地记录的屏幕使用时间数据,此操作不可撤销。",
      confirmText: "清除",
      danger: true,
      action: clearActivityData,
    });
  };

  function handleExportICS() {
    if (!scheduleData?.schedule) return;
    const ics = buildWeekICS(scheduleData.schedule, new Date());
    downloadICS(ics, `schedule-${new Date().toISOString().slice(0, 10)}.ics`);
  }

  const handleRefreshFromSchool = async () => {
    if (!schoolId || !username) {
      showToast("warning", "请先登录学校账号");
      return;
    }
    try {
      // 凭证由服务端从本地数据库读取(含 cookie 过期静默重登),无需前端传 cookie。
      const result = await refreshData.mutateAsync({
        schoolId,
        cookie: "",
        username,
      });
      if (result.success) {
        showToast(
          "success",
          `数据刷新成功：${result.fetched?.join("、") || "全部"}`,
        );
        loadStudentInfo(); // 刷新成功后更新用户卡片的 GPA/学分/课程
      } else if (result.needsManualLogin) {
        showToast("warning", "登录已过期，请退出后重新登录再刷新");
      } else {
        showToast("error", `刷新失败：${result.error || "未知错误"}`);
      }
    } catch (e) {
      showToast(
        "error",
        `刷新失败：${e instanceof Error ? e.message : "未知错误"}`,
      );
    }
  };

  // ── Derived display values ──────────────────────────────────
  const displayName =
    studentInfo?.studentId || userId || username || "ScholarFlow 用户";
  const avatarLetter = displayName[0]?.toUpperCase() || "S";
  const schoolName =
    schoolId === "njtech" ? "南京工业大学" : schoolId || "未绑定";
  const isSynced = !!studentInfo?.studentId || !!schoolId;

  return (
    <div className="pb-20 md:pb-0 max-w-lg mx-auto animate-page">
      <PageHeader
        icon={<User className="w-5 h-5 text-primary" />}
        title="用户中心"
      />

      {/* ── 用户卡片 ──────────────────────────────────────────── */}
      <Card className="rounded-[28px] p-0 mb-5 relative overflow-hidden animate-fade-up hover:translate-y-0 hover:shadow-sm">
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-primary/4 blur-2xl" />
        </div>

        <CardHeader className="relative px-6 pt-6 pb-0">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-[22px] bg-primary/10 blur-xl"
                aria-hidden="true"
              />
              <div className="relative w-14 h-14 rounded-[22px] flex items-center justify-center bg-primary text-primary-foreground font-display text-[22px] font-bold shadow-sm">
                {avatarLetter}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[16px] font-semibold tabular-nums text-foreground truncate">
                {displayName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1 text-[11px]">
                <Badge
                  variant="secondary"
                  aria-hidden="true"
                  className={cn(
                    "w-1.5 h-1.5 rounded-full p-0 border-0 shrink-0",
                    isSynced
                      ? "bg-[var(--status-success)]"
                      : "bg-muted-foreground/40",
                  )}
                />
                <span>
                  {isSynced ? "已同步教务系统" : "未同步教务系统"}
                </span>
              </CardDescription>
              {schoolId && (
                <CardDescription className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                  <School className="w-3 h-3 text-primary/60" />
                  <span>{schoolName}</span>
                </CardDescription>
              )}
            </div>

            {/* Logout button — always visible */}
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmLogout}
              className="shrink-0 rounded-xl"
              aria-label="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[12px]">退出</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative px-6 pb-6 pt-5">
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            {studentInfo ? (
              <>
                <StatChip value={studentInfo.gpa} label="GPA" accent />
                <StatChip value={String(studentInfo.totalCredits)} label="学分" />
                <StatChip value={String(studentInfo.courseCount)} label="课程" />
              </>
            ) : (
              <>
                <StatChip
                  value={String(scheduleData?.schedule?.courses?.length ?? 0)}
                  label="课程"
                />
                <StatChip
                  value={String(assignments.filter((a) => !a.done).length)}
                  label="待办"
                />
              </>
            )}
            <StatChip value={String(records.length)} label="跑步" />
          </div>
        </CardContent>
      </Card>

      {/* ── 外观 ──────────────────────────────────────────────── */}
      <SettingsSection icon={<Sun className="w-4 h-4" />} title="外观">
        <SegmentedControl
          options={THEME_OPTIONS.map((opt) => ({
            id: opt.value,
            label: opt.label,
            icon: opt.Icon,
          }))}
          value={theme}
          onChange={(id) => setTheme(id as ThemeValue)}
        />
      </SettingsSection>

      {/* ── 数据刷新 ──────────────────────────────────────────── */}
      <SettingsSection
        icon={<RefreshCw className="w-4 h-4" />}
        title="数据刷新"
      >
        <p className="text-[11px] mb-3 text-muted-foreground">
          从学校教务系统重新抓取课表、成绩、考试等数据
        </p>
        <Button
          variant="default"
          onClick={handleRefreshFromSchool}
          disabled={refreshData.isPending}
          className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-left text-[13px] font-medium active:translate-y-0.5 disabled:opacity-60"
        >
          <RefreshCw
            className={cn(
              "w-4 h-4 shrink-0",
              refreshData.isPending && "animate-spin",
            )}
          />
          <span>
            {refreshData.isPending ? "刷新中..." : "从教务系统刷新数据"}
          </span>
          <span className="text-[11px] ml-auto text-primary-foreground/70">
            课表 · 成绩 · 考试
          </span>
        </Button>
      </SettingsSection>

      {/* ── 账户安全：清除已记住的密码（仅 Electron） ──────────── */}
      {showClearPassword && (
        <SettingsSection
          icon={<KeyRound className="w-4 h-4" />}
          title="账户安全"
        >
          <p className="text-[11px] mb-3 text-muted-foreground">
            清除本地加密存储的教务密码，并停止后台自动刷新
          </p>
          <Button
            variant="destructive"
            onClick={confirmClearPassword}
            disabled={clearingPassword}
            className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-left text-[13px] font-medium active:translate-y-0.5 disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>{clearingPassword ? "清除中..." : "清除已记住的密码"}</span>
          </Button>
        </SettingsSection>
      )}

      {/* ── 数据导出 ──────────────────────────────────────────── */}
      <SettingsSection icon={<Download className="w-4 h-4" />} title="数据导出">
        <MenuItem
          icon={Calendar}
          label="导出课表 (ICS)"
          onClick={handleExportICS}
          disabled={!scheduleData?.schedule}
        />
        <MenuItem
          icon={ClipboardList}
          label="导出作业 (CSV)"
          onClick={() => exportAssignmentsCSV(assignments)}
          disabled={!assignments.length}
        />
        <MenuItem
          icon={Activity}
          label="导出跑步 (CSV)"
          onClick={() => exportRunningCSV(records)}
          disabled={!records.length}
        />
        <MenuItem
          icon={BarChart3}
          label="导出屏幕时间 (CSV)"
          onClick={downloadActivityCSV}
        />
        <MenuItem
          icon={Trash2}
          label="清除屏幕时间数据"
          onClick={confirmClearActivity}
          danger
          last
        />
      </SettingsSection>

      {/* ── 存储信息 ──────────────────────────────────────────── */}
      <Card className="mb-4 hover:translate-y-0 hover:shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <CardTitle className="text-[13px] font-semibold">存储信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-[11px]">
            <InfoRow
              icon={<ShieldCheck className="w-3 h-3" />}
              label="数据存储"
              value="SQLite 本地数据库"
            />
            <InfoRow
              icon={<Clock className="w-3 h-3" />}
              label="课表/作业/跑步"
              value="本地优先，自动持久化"
            />
            <InfoRow
              icon={<GraduationCap className="w-3 h-3" />}
              label="学校凭证"
              value="安全加密存储"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 关于 ──────────────────────────────────────────── */}
      <Card className="mb-4 hover:translate-y-0 hover:shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <CardTitle className="text-[13px] font-semibold">关于</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-[14px] font-semibold mb-1 text-primary font-display">
            ScholarFlow
          </div>
          <div className="text-[11px] text-muted-foreground">
            v2.0 · Electron + Next.js
          </div>
          <div className="text-[11px] mt-0.5 text-muted-foreground">
            独立学习管理中枢
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            <Badge
              variant="secondary"
              className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--status-success)]/10 text-[var(--status-success)] font-medium hover:bg-[var(--status-success)]/10"
            >
              PWA
            </Badge>
            <Badge
              variant="secondary"
              className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--status-warning)]/10 text-[var(--status-warning)] font-medium hover:bg-[var(--status-warning)]/10"
            >
              离线优先
            </Badge>
            <Badge
              variant="secondary"
              className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/10"
            >
              SQLite
            </Badge>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            按{" "}
            <kbd className="px-1 py-0.5 rounded text-[11px] font-mono bg-secondary border border-border">
              ?
            </kbd>{" "}
            查看快捷键
          </div>
        </CardContent>
      </Card>

      {/* ── 确认对话框(替代原生 confirm) ─────────────────────── */}
      <ConfirmDialog
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        confirmText={confirmState?.confirmText}
        danger={confirmState?.danger ?? true}
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
      />
    </div>
  );
}

// ── 子组件 ──────────────────────────────────────────────────────

function StatChip({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl p-2.5 text-center bg-secondary/60">
      <div
        className={cn(
          "text-[16px] font-semibold tabular-nums",
          accent ? "text-[var(--status-success)]" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  last,
}: {
  icon: typeof Sun;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full justify-start gap-3 px-2 py-3 h-auto text-left text-[13px] font-normal rounded-none",
        !last && "border-b border-border",
        disabled &&
          "text-muted-foreground opacity-50 cursor-default hover:bg-transparent",
        danger && !disabled && "text-destructive hover:bg-destructive/8",
        !danger && !disabled && "text-foreground hover:bg-secondary/40",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      {!disabled && (
        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />
      )}
    </Button>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-primary/60 shrink-0">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right ml-auto text-foreground">{value}</span>
    </div>
  );
}
