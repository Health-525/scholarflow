"use client";

import { CalendarDays, ChevronLeft, ChevronRight, PenLine, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { DailyCalendarSidebar } from "@/components/reports/DailyCalendarSidebar";
import { DailyEditorV2 } from "@/components/reports/DailyEditorV2";
import { DailyEmptyState } from "@/components/reports/DailyEmptyState";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { showToast } from "@/components/ui/ToastContainer";
import { useDailyReport, useDailyReports } from "@/hooks/useReports";
import { getAuthParams } from "@/lib/api/auth-params";
import { parseISODate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function loadPomodoroSessions(): Promise<unknown> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("sf_pomodoro_sessions");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

async function loadActivityLog(dateStr: string): Promise<unknown> {
  if (typeof window === "undefined") return null;
  try {
    if (window.electronAPI?.queryActivityDay) {
      return await window.electronAPI.queryActivityDay(dateStr);
    }
  } catch {
    // ignore
  }
  return null;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

function formatWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("zh-CN", { weekday: "long" });
}

export default function DailyReportsPage() {
  const searchParams = useSearchParams();

  const initialDate = useMemo(() => {
    const fromUrl = searchParams?.get("date");
    return fromUrl && parseISODate(fromUrl) ? fromUrl : getTodayStr();
  }, [searchParams]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { entries, isLoading: listLoading, error: listError, reload: reloadList } = useDailyReports();
  const { content, isLoading: contentLoading, error: contentError, reload: reloadContent } = useDailyReport(selectedDate);

  const datesWithReport = useMemo(() => {
    return new Set(entries.map((e) => e.name.replace(".md", "")));
  }, [entries]);

  const hasReport = datesWithReport.has(selectedDate);
  const todayStr = useMemo(() => getTodayStr(), []);
  const isToday = selectedDate === todayStr;

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsEditing(false);
    setSidebarOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("date", date);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [pomodoroSessions, activityLog] = await Promise.all([
        loadPomodoroSessions(),
        loadActivityLog(selectedDate),
      ]);
      const res = await fetch(`/api/reports/daily/generate?${getAuthParams()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: true,
          date: selectedDate,
          pomodoroSessions,
          activityLog,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; date?: string; error?: string };
      if (res.ok && data.ok) {
        showToast("success", "AI 日报生成成功");
        await Promise.all([reloadList(), reloadContent()]);
        setIsEditing(false);
      } else {
        showToast("error", data.error || "日报生成失败");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "日报生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaved = () => {
    reloadList();
    reloadContent();
    setIsEditing(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden animate-page">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭侧边栏"
          className="fixed inset-0 bg-black/10 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-[240px] bg-background/80 backdrop-blur-xl border-r border-border/30 transform transition-transform duration-200 ease-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <DailyCalendarSidebar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          datesWithReport={datesWithReport}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 px-5 md:px-12 lg:px-16 pt-8 md:pt-10 pb-5 md:pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 md:gap-3 mb-1">
                  <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {formatDateLabel(selectedDate)}
                  </h1>
                  <span className="text-sm text-muted-foreground font-medium">
                    {formatWeekday(selectedDate)}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary">
                  {isToday ? "今天" : selectedDate}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleSelectDate(addDays(selectedDate, -1))}
                  aria-label="前一天"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                  aria-label="后一天"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-border/60 mx-1" />
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="gap-1.5 h-8 px-3 text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "生成中..." : "生成日报"}
                </Button>
                {hasReport && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5 h-8 px-3 text-xs font-medium border-border/60"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    编辑
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile toolbar */}
            <div className="flex md:hidden items-center justify-between mt-4">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleSelectDate(addDays(selectedDate, -1))}
                  aria-label="前一天"
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                  aria-label="后一天"
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="gap-1.5 h-9 px-3 text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "生成中" : "生成"}
                </Button>
                {hasReport && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5 h-9 px-3 text-xs font-medium border-border/60"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    编辑
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidebarOpen(true)}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <CalendarDays className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-16 pb-16">
          {listLoading || contentLoading ? (
            <div className="py-24">
              <LoadingSpinner label="加载中..." />
            </div>
          ) : listError || contentError ? (
            <div className="max-w-3xl mx-auto py-12">
              <ErrorFallback
                message={(listError || contentError)?.message || "加载失败"}
                onRetry={() => {
                  reloadList();
                  reloadContent();
                }}
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {hasReport ? (
                isEditing ? (
                  <DailyEditorV2
                    date={selectedDate}
                    initialContent={content}
                    onSaved={handleSaved}
                  />
                ) : (
                  <MarkdownRenderer content={content} className="markdown-body markdown-daily" />
                )
              ) : (
                <DailyEmptyState
                  dateLabel={formatDateLabel(selectedDate)}
                  onGenerate={handleGenerate}
                  onWrite={() => setIsEditing(true)}
                  generating={generating}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
