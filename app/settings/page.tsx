"use client";

import { Palette, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsSection } from "@/components/ui/settings-section";
import { showToast } from "@/components/ui/ToastContainer";
import {
  useScheduleQuery,
  useAssignmentsQuery,
  useRunningQuery,
  useRefreshData,
} from "@/hooks/useQueries";
import {
  clearActivityData,
  downloadActivityCSV,
} from "@/lib/activity-tracker-v3";
import {
  exportAssignmentsCSV,
  exportRunningCSV,
  buildWeekICS,
  downloadICS,
} from "@/lib/export";
import { useIsMobile } from "@/hooks/useIsMobile";
import { isElectron } from "@/lib/runtime-env";
import { applySkin, getSkin, setSkin, type SkinValue } from "@/lib/skin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";

import {
  AboutCard,
  AccountSecuritySection,
  DataExportSection,
  DataRefreshSection,
  StorageInfoCard,
  ThemeSection,
  UserProfileCard,
} from "./components";
import type { ConfirmState, StudentInfo } from "./types";

const SKIN_OPTIONS: { value: SkinValue; label: string; dot: string }[] = [
  { value: "ximi", label: "粉色小咪", dot: "#ffb7ce" },
  { value: "blue", label: "清新青", dot: "#0d9488" },
];

export default function SettingsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
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
  const [skin, setSkinState] = useState<SkinValue>("ximi");

  const refreshData = useRefreshData();

  useEffect(() => {
    setMounted(true);
    setShowClearPassword(isElectron());
  }, []);

  useEffect(() => {
    setSkinState(getSkin());
  }, []);

  const changeSkin = (s: SkinValue) => {
    setSkinState(s);
    setSkin(s);
    applySkin(s);
  };

  // 复用的学生信息(GPA/学分/课程)加载器,刷新成功后可再次调用以更新卡片。
  const loadStudentInfo = useCallback(() => {
    if (!schoolId || !userId) return;
    fetch(`/api/local-data?type=student&schoolId=${schoolId}&userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.studentId) setStudentInfo(d);
      })
      .catch(() => {});
  }, [schoolId, userId]);

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
          schoolId,
          userId,
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
          schoolId,
          userId,
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
      action: async () => {
        await clearActivityData();
      },
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

      <UserProfileCard
        displayName={displayName}
        avatarLetter={avatarLetter}
        schoolName={schoolName}
        isSynced={isSynced}
        schoolId={schoolId}
        studentInfo={studentInfo}
        scheduleCourseCount={scheduleData?.schedule?.courses?.length ?? 0}
        pendingAssignmentsCount={assignments.filter((a) => !a.done).length}
        recordsCount={records.length}
        onLogout={confirmLogout}
      />

      <ThemeSection theme={theme} onChange={setTheme} />

      {isMobile && (
        <SettingsSection icon={<Palette className="w-4 h-4" />} title="配色">
          <div className="mb-2">
            <span className="text-[11px] text-muted-foreground/70">
              仅手机端生效
            </span>
          </div>
          <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
            {SKIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeSkin(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                  skin === opt.value
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
                aria-pressed={skin === opt.value}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: opt.dot }}
                />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </SettingsSection>
      )}

      <DataRefreshSection
        isPending={refreshData.isPending}
        onRefresh={handleRefreshFromSchool}
      />

      {showClearPassword && (
        <AccountSecuritySection
          clearingPassword={clearingPassword}
          onClearPassword={confirmClearPassword}
        />
      )}

      <DataExportSection
        scheduleData={scheduleData}
        assignments={assignments}
        records={records}
        onExportICS={handleExportICS}
        onExportAssignments={() => exportAssignmentsCSV(assignments)}
        onExportRunning={() => exportRunningCSV(records)}
        onExportActivity={() => downloadActivityCSV().catch(() => {})}
        onConfirmClearActivity={confirmClearActivity}
      />

      <StorageInfoCard />

      <AboutCard />

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
