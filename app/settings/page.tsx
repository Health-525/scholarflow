"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Moon, Monitor, LogOut, ChevronRight,
  Calendar, ClipboardList, Activity, Database,
  BarChart3, Trash2, Download, CloudDownload, CloudUpload,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { downloadActivityCSV, clearActivityData } from "@/lib/activity-tracker-v3";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery, useSyncFromGitHub, useSyncToGitHub } from "@/hooks/useQueries";
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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);

  const syncFromGitHub = useSyncFromGitHub();
  const syncToGitHub = useSyncToGitHub();

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
        <h1 className="text-lg font-bold text-foreground">用户中心</h1>
      </div>

      {/* ── 用户卡片 ── */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden bg-card border border-border shadow-sm">
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none opacity-[0.06] bg-gradient-to-br from-primary to-transparent"
        />

        <div className="relative flex items-center gap-4">
          {/* 头像 */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-[serif] text-[22px] font-bold">
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            {studentInfo ? (
              <>
                <div className="text-[16px] font-semibold tabular-nums text-foreground">
                  {studentInfo.studentId}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[12px] text-muted-foreground">已同步教务系统</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[16px] font-semibold text-foreground">ScholarFlow 用户</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">未同步教务系统</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {studentInfo && (
            <>
              <div className="rounded-xl p-2.5 text-center bg-secondary">
                <div className="text-[16px] font-semibold tabular-nums text-green-700">{studentInfo.gpa}</div>
                <div className="text-[10px] text-muted-foreground">GPA</div>
              </div>
              <div className="rounded-xl p-2.5 text-center bg-secondary">
                <div className="text-[16px] font-semibold tabular-nums text-foreground">{studentInfo.totalCredits}</div>
                <div className="text-[10px] text-muted-foreground">学分</div>
              </div>
              <div className="rounded-xl p-2.5 text-center bg-secondary">
                <div className="text-[16px] font-semibold tabular-nums text-foreground">{studentInfo.courseCount}</div>
                <div className="text-[10px] text-muted-foreground">课程</div>
              </div>
            </>
          )}
          {!studentInfo && (
            <>
              <div className="rounded-xl p-2.5 text-center bg-secondary">
                <div className="text-[16px] font-semibold tabular-nums text-foreground">{scheduleData?.schedule?.courses?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">课程</div>
              </div>
              <div className="rounded-xl p-2.5 text-center bg-secondary">
                <div className="text-[16px] font-semibold tabular-nums text-foreground">{assignments.filter(a => !a.done).length}</div>
                <div className="text-[10px] text-muted-foreground">待办</div>
              </div>
            </>
          )}
          <div className="rounded-xl p-2.5 text-center bg-secondary">
            <div className="text-[16px] font-semibold tabular-nums text-foreground">{records.length}</div>
            <div className="text-[10px] text-muted-foreground">跑步</div>
          </div>
        </div>
      </div>

      {/* ── 外观 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <currentThemeOption.Icon className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">外观</span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                  theme === opt.value
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
                aria-pressed={theme === opt.value}
              >
                <opt.Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
                {theme === opt.value && <span className="w-1 h-1 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 数据导出 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Download className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">数据导出</span>
        </div>
        <div className="pb-2">
          <MenuItem icon={Calendar} label="导出课表 (ICS)" onClick={handleExportICS} disabled={!scheduleData?.schedule} />
          <MenuItem icon={ClipboardList} label="导出作业 (CSV)" onClick={() => exportAssignmentsCSV(assignments)} disabled={!assignments.length} />
          <MenuItem icon={Activity} label="导出跑步 (CSV)" onClick={() => exportRunningCSV(records)} disabled={!records.length} />
          <MenuItem icon={BarChart3} label="导出屏幕时间 (CSV)" onClick={downloadActivityCSV} />
          <MenuItem icon={Trash2} label="清除屏幕时间数据" onClick={() => { if (confirm("确定清除？")) clearActivityData(); }} danger last />
        </div>
      </div>

      {/* ── GitHub 同步 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span className="text-[13px] font-semibold text-foreground">GitHub 同步</span>
          {token && (
            <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">已连接</span>
          )}
        </div>
        <div className="px-4 pb-2">
          <p className="text-[11px] mb-3 text-muted-foreground">
            {token
              ? "数据默认保存本地，可手动从 GitHub 导入或同步到 GitHub"
              : "配置 GitHub Token 后可使用云端同步功能"}
          </p>

          {/* 同步状态消息 */}
          {syncMessage && (
            <div className={`mb-3 px-3 py-2.5 rounded-xl text-[11px] animate-fade-up whitespace-pre-line ${
              syncMessage.includes("失败") || syncMessage.includes("错误")
                ? "bg-red-500/8 text-red-500"
                : "bg-green-500/8 text-green-600"
            }`}>
              {syncMessage}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={async () => {
                if (!token) { setSyncMessage("请先在登录页配置 GitHub Token"); return; }
                setSyncMessage(null);
                try {
                  const result = await syncFromGitHub.mutateAsync(["schedule", "assignments", "running"]);
                  if (result.imported.length > 0) {
                    const lines = result.imported.map(t => result.details[t]).filter(Boolean);
                    setSyncMessage(lines.length > 0 ? lines.join("\n") : `导入成功：${result.imported.join("、")}`);
                  } else {
                    setSyncMessage(result.errors.length ? `导入失败：${result.errors.join("、")}` : "无新数据");
                  }
                } catch (e) {
                  setSyncMessage(`导入失败：${e instanceof Error ? e.message : "未知错误"}`);
                }
              }}
              disabled={!token || syncFromGitHub.isPending}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                token ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              } ${syncFromGitHub.isPending ? "opacity-60" : ""}`}
            >
              <CloudDownload className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-medium">
                {syncFromGitHub.isPending ? "导入中..." : "从 GitHub 导入数据"}
              </span>
              <span className="text-[10px] ml-auto text-muted-foreground">课表 · 作业 · 跑步</span>
            </button>

            <button
              onClick={async () => {
                if (!token) { setSyncMessage("请先在登录页配置 GitHub Token"); return; }
                setSyncMessage(null);
                try {
                  const result = await syncToGitHub.mutateAsync(["schedule", "assignments", "running"]);
                  if (result.pushed.length > 0) {
                    setSyncMessage(`同步成功：${result.pushed.join("、")}${result.errors.length ? `；失败：${result.errors.join("、")}` : ""}`);
                  } else {
                    setSyncMessage(result.errors.length ? `同步失败：${result.errors.join("、")}` : "无数据可同步");
                  }
                } catch (e) {
                  setSyncMessage(`同步失败：${e instanceof Error ? e.message : "未知错误"}`);
                }
              }}
              disabled={!token || syncToGitHub.isPending}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                token ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              } ${syncToGitHub.isPending ? "opacity-60" : ""}`}
            >
              <CloudUpload className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-medium">
                {syncToGitHub.isPending ? "同步中..." : "同步到 GitHub"}
              </span>
              <span className="text-[10px] ml-auto text-muted-foreground">课表 · 作业 · 跑步</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 缓存与存储 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">缓存与存储</span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-muted-foreground">
              IndexedDB: <span className="font-semibold tabular-nums">{cacheSize === null ? "--" : cacheSize}</span> 文件
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => getDB().cachedFiles.count().then(n => setCacheSize(n)).catch(() => {})} className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-primary/10 text-primary">刷新</button>
              <button onClick={() => { getDB().cachedFiles.clear(); getDB().mutationsQueue.clear(); setCacheSize(0); }} className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-red-500/8 text-red-500">清除</button>
            </div>
          </div>
          <div className="space-y-1.5 text-[11px] pt-3 border-t border-border">
            <InfoRow label="Token" value="安全加密存储" />
            <InfoRow label="课表/作业/跑步" value="本地优先，自动 Git 版本管理" />
            <InfoRow label="考试/主题/目标" value="localStorage" />
          </div>
        </div>
      </div>

      {/* ── 数据版本历史 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">版本历史</span>
        </div>
        <div className="px-4 pb-4">
          <p className="text-[11px] mb-3 text-muted-foreground">
            每次数据变更自动生成 Git 提交记录，可在 timetable 目录用 git log 回溯
          </p>
          {historyMessage && (
            <div className="mb-3 px-3 py-2.5 rounded-xl text-[11px] animate-fade-up whitespace-pre-line bg-secondary text-foreground max-h-48 overflow-y-auto">
              {historyMessage}
            </div>
          )}
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/local-save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "view-history" }),
                });
                const data = await res.json();
                if (data.history) {
                  setHistoryMessage(data.history);
                }
              } catch {
                setHistoryMessage("获取历史失败");
              }
            }}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium bg-primary/10 text-primary"
          >
            查看最近记录
          </button>
        </div>
      </div>

      {/* ── 关于 ── */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm">
        <div className="p-4 text-center">
          <div className="text-[14px] font-semibold mb-1 text-primary font-[serif]">ScholarFlow</div>
          <div className="text-[11px] text-muted-foreground">v1.2.0 · Electron + Next.js</div>
          <div className="text-[10px] mt-0.5 text-muted-foreground">统一学习管理中枢</div>
        </div>
      </div>

      {/* ── 退出 ── */}
      {token && (
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

function MenuItem({
  icon: Icon, label, onClick, disabled, danger, last,
}: {
  icon: typeof Sun; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
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
