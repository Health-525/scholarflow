"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, PenLine, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { DailyEditorV2 } from "@/components/reports/DailyEditorV2";
import { DailyEmptyState } from "@/components/reports/DailyEmptyState";
import { DateStrip } from "@/components/reports/DateStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showToast } from "@/components/ui/ToastContainer";
import { useDailyReport, useDailyReports } from "@/hooks/useReports";
import { getAuthParams } from "@/lib/api/auth-params";
import { parseISODate, todayISO } from "@/lib/date-utils";

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

type ConfirmStateType =
  | { type: "discard-edit"; pendingDate: string }
  | { type: "overwrite-generate" }
  | null;

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

export default function DailyReportsPage() {
  const searchParams = useSearchParams();

  const initialDate = useMemo(() => {
    const fromUrl = searchParams?.get("date");
    return fromUrl && parseISODate(fromUrl) ? fromUrl : todayISO();
  }, [searchParams]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmStateType>(null);

  const { entries, isLoading: listLoading, error: listError, reload: reloadList } = useDailyReports();
  const { content, isLoading: contentLoading, error: contentError, reload: reloadContent } = useDailyReport(selectedDate);

  const datesWithReport = useMemo(() => {
    return new Set(entries.map((e) => e.name.replace(".md", "")));
  }, [entries]);

  const hasReport = datesWithReport.has(selectedDate);
  const todayStr = useMemo(() => todayISO(), []);
  const isToday = selectedDate === todayStr;

  const handleSelectDate = (date: string) => {
    if (isDirty) {
      setConfirmState({ type: "discard-edit", pendingDate: date });
      return;
    }
    setSelectedDate(date);
    setIsEditing(false);
    setIsDirty(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("date", date);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleGenerate = async () => {
    if (isDirty) {
      setConfirmState({ type: "overwrite-generate" });
      return;
    }
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
          date: selectedDate,
          pomodoroSessions,
          activityLog,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; date?: string; ai?: boolean; error?: string };
      if (res.ok && data.ok) {
        showToast("success", data.ai ? "AI 日报生成成功" : "已使用模板生成日报");
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
    setIsDirty(false);
  };

  const handleConfirmDialogConfirm = async () => {
    if (!confirmState) return;
    if (confirmState.type === "discard-edit") {
      const newDate = confirmState.pendingDate;
      setConfirmState(null);
      setSelectedDate(newDate);
      setIsEditing(false);
      setIsDirty(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("date", newDate);
        window.history.replaceState(null, "", url.toString());
      }
    } else if (confirmState.type === "overwrite-generate") {
      setConfirmState(null);
      await handleGenerate();
    }
  };

  const selectedDateObj = useMemo(() => {
    const d = parseISODate(selectedDate);
    return d ?? undefined;
  }, [selectedDate]);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-primary" />}
        title="日报"
        description="记录每日课程、作业与思考"
      />

      {/* Date strip + calendar picker */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <DateStrip
              selectedDate={selectedDate}
              datesWithReport={datesWithReport}
              onSelect={handleSelectDate}
            />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={(date) => {
                    if (date) {
                      handleSelectDate(
                        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                      );
                      setCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Selected day card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {formatDateLabel(selectedDate)}
                </h1>
                <span className="text-sm text-muted-foreground font-medium">
                  {formatWeekday(selectedDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isToday && <Badge variant="secondary">今天</Badge>}
                {hasReport && <Badge variant="outline">已记录</Badge>}
                {!hasReport && <Badge variant="outline" className="text-muted-foreground">未记录</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditing && (
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="gap-1.5 h-8 px-3 text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "生成中..." : "生成日报"}
                </Button>
              )}
              {hasReport && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 h-8 px-3 text-xs font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  编辑
                </Button>
              )}
              {!hasReport && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 h-8 px-3 text-xs font-medium"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  手写
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {listLoading || contentLoading ? (
            <div className="py-20">
              <LoadingSpinner label="加载中..." />
            </div>
          ) : listError || contentError ? (
            <div className="py-12">
              <ErrorFallback
                message={(listError || contentError)?.message || "加载失败"}
                onRetry={() => {
                  reloadList();
                  reloadContent();
                }}
              />
            </div>
          ) : isEditing ? (
            <DailyEditorV2
              date={selectedDate}
              initialContent={content}
              onSaved={handleSaved}
              onAutoSaved={() => reloadList()}
              onDirtyChange={setIsDirty}
            />
          ) : hasReport ? (
            <div className="pb-2">
              <MarkdownRenderer content={content} className="markdown-body markdown-daily" />
            </div>
          ) : (
            <DailyEmptyState dateLabel={formatDateLabel(selectedDate)} />
          )}
        </CardContent>
      </Card>

      {/* Quick today / prev / next for mobile */}
      <div className="flex items-center justify-between mt-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => handleSelectDate(addDays(selectedDate, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
          前一天
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => handleSelectDate(todayStr)}
          disabled={isToday}
        >
          今天
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => handleSelectDate(addDays(selectedDate, 1))}
        >
          后一天
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <ConfirmDialog
        open={confirmState !== null}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={
          confirmState?.type === "discard-edit"
            ? "放弃未保存的修改？"
            : "覆盖未保存的内容？"
        }
        description={
          confirmState?.type === "discard-edit"
            ? "当前日报有未保存的修改，确定要切换日期吗？"
            : "当前日报有未保存的修改，生成日报会覆盖它，是否继续？"
        }
        confirmText={
          confirmState?.type === "discard-edit" ? "放弃修改" : "生成并覆盖"
        }
        danger={true}
        onConfirm={handleConfirmDialogConfirm}
      />
    </div>
  );
}
