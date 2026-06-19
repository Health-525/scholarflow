"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { showToast } from "@/components/ui/ToastContainer";
import { useScheduleQuery } from "@/hooks/useQueries";
import { parseExamDate } from "@/lib/parse-exam-date";
import { useAuthStore } from "@/store/auth";
import type { Exam } from "@/types/exam";

// ── JWGL 原始格式 ────────────────────────────────────────────

interface JWGLExam {
  kch?: string;
  kcmc?: string;
  kssj?: string;
  jxdd?: string;
}

// ── API helpers ──────────────────────────────────────────────

function accountParams(schoolId: string | null, userId: string | null) {
  const p = new URLSearchParams();
  if (schoolId) p.set("schoolId", schoolId);
  if (userId) p.set("userId", userId);
  return p.toString();
}

async function checkOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败 (${res.status}): ${text || res.statusText}`);
  }
}

async function apiGet(schoolId: string | null, userId: string | null): Promise<Exam[]> {
  const res = await fetch(`/api/exams?${accountParams(schoolId, userId)}`);
  await checkOk(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiAdd(
  exam: Omit<Exam, "id" | "source" | "status">,
  schoolId: string | null,
  userId: string | null
): Promise<Exam> {
  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam, schoolId, userId }),
  });
  await checkOk(res);
  const data = await res.json();
  if (!data.exam) throw new Error("服务端未返回考试数据");
  return data.exam;
}

async function apiPatch(
  id: string,
  status: Exam["status"],
  schoolId: string | null,
  userId: string | null
) {
  const res = await fetch("/api/exams", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, schoolId, userId }),
  });
  await checkOk(res);
}

async function apiDelete(
  id: string,
  schoolId: string | null,
  userId: string | null
) {
  const res = await fetch(`/api/exams?id=${encodeURIComponent(id)}&${accountParams(schoolId, userId)}`, {
    method: "DELETE",
  });
  await checkOk(res);
}

async function apiImportJwgl(
  schoolId: string | null,
  userId: string | null
): Promise<{ added: number }> {
  // 1. 从 local-data 拉取教务原始考试数据
  const sid = schoolId || "njtech";
  const uid = userId || "default";
  const raw = await fetch(`/api/local-data?type=exams&schoolId=${sid}&userId=${uid}`);
  if (!raw.ok) return { added: 0 };
  const rawData = await raw.json();
  if (!Array.isArray(rawData) || rawData.length === 0) return { added: 0 };

  // 2. 映射格式
  const exams = rawData
    .map((e: JWGLExam) => {
      const timeMatch = (e.kssj || "").match(/\((\d{2}:\d{2}-\d{2}:\d{2})\)/);
      return {
        id: `jwgl-${e.kch || Math.random().toString(36).slice(2)}`,
        subject: e.kcmc || e.kch || "",
        date: parseExamDate(e.kssj),
        time: timeMatch ? timeMatch[1] : undefined,
        location: (e.jxdd || "").replace(/\(多\)/g, "").replace(/;/g, " / ") || undefined,
      };
    })
    .filter((e: { subject: string; date: string }) => e.subject && e.date);

  // 3. 批量写入（服务端自动去重，不恢复已删除的教务考试）
  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exams, schoolId, userId }),
  });
  await checkOk(res);
  const data = await res.json();
  return { added: data.added ?? 0 };
}

// ── 倒计时格式化 ─────────────────────────────────────────────

function formatCountdown(
  dateStr: string
): { text: string; urgency: "today" | "soon" | "normal" | "past" } {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return { text: "已过期", urgency: "past" };
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days === 0) return { text: hours > 0 ? `今天 · ${hours}h后` : "今天", urgency: "today" };
  if (days === 1) return { text: "明天", urgency: "today" };
  if (days <= 3) return { text: `${days} 天后`, urgency: "soon" };
  return { text: `${days} 天后`, urgency: "normal" };
}

function daysUntil(dateStr: string): number | null {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 86400000);
}

const urgencyColor = {
  today: "text-destructive",
  soon: "text-amber-600 dark:text-amber-400",
  normal: "text-muted-foreground",
  past: "text-muted-foreground",
};

const urgencyStyle = {
  today: {
    bg: "rgba(var(--status-error-rgb), 0.1)",
    color: "var(--status-error)",
  },
  soon: {
    bg: "rgba(var(--status-warning-rgb), 0.1)",
    color: "var(--status-warning)",
  },
  normal: {
    bg: "rgba(var(--primary-rgb), 0.08)",
    color: "var(--primary)",
  },
  past: {
    bg: "rgba(var(--primary-rgb), 0.06)",
    color: "var(--muted-foreground)",
  },
};

// ── 常量 ─────────────────────────────────────────────────────

type Tone = "primary" | "success" | "warning" | "danger";

const TONE_STYLES: Record<Tone, { bg: string; color: string }> = {
  primary: {
    bg: "rgba(var(--primary-rgb), 0.1)",
    color: "var(--primary)",
  },
  success: {
    bg: "rgba(var(--status-success-rgb), 0.1)",
    color: "var(--status-success)",
  },
  warning: {
    bg: "rgba(var(--status-warning-rgb), 0.1)",
    color: "var(--status-warning)",
  },
  danger: {
    bg: "rgba(var(--status-error-rgb), 0.1)",
    color: "var(--status-error)",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: Tone;
}) {
  const style = TONE_STYLES[tone];
  return (
    <Card hover={false} className="p-3">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: style.bg, color: style.color }}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums leading-none text-foreground">
            {value}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── 统计 ─────────────────────────────────────────────────────

function ExamStats({ exams }: { exams: Exam[] }) {
  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible.filter((e) => e.status === "upcoming");
  const completed = visible.filter((e) => e.status === "completed");
  const next = upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextDays = next ? daysUntil(next.date) : null;

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard icon={Clock} label="待考" value={upcoming.length} tone="primary" />
      <StatCard
        icon={TrendingUp}
        label="最近考试"
        value={nextDays === null ? "—" : `${nextDays} 天`}
        tone={nextDays !== null && nextDays <= 3 ? "danger" : "primary"}
      />
      <StatCard icon={CheckCircle2} label="已完成" value={completed.length} tone="success" />
    </div>
  );
}

// ── 快捷添加表单 ─────────────────────────────────────────────

function QuickAddForm({
  subjects,
  onAdd,
  disabled,
}: {
  subjects: string[];
  onAdd: (exam: Omit<Exam, "id" | "source" | "status">) => Promise<void>;
  disabled?: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const canSubmit = Boolean(subject.trim() && date);

  const reset = useCallback(() => {
    setSubject("");
    setDate("");
    setTime("");
    setLocation("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onAdd({
      subject: subject.trim(),
      date,
      time: time || undefined,
      location: location || undefined,
    });
    reset();
  };

  return (
    <Card className="border-dashed bg-transparent">
      <CardHeader>
        <CardTitle className="text-base">添加考试</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">科目</span>
            <SubjectSelector
              subjects={subjects}
              value={subject}
              onChange={setSubject}
              className="max-h-32 overflow-y-auto"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exam-date" className="mb-1.5 block text-sm font-medium text-foreground">
                日期
              </label>
              <div className="relative">
                <Input
                  id="exam-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={disabled}
                  required
                  className="h-10 pl-9"
                />
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label htmlFor="exam-time" className="mb-1.5 block text-sm font-medium text-foreground">
                时间
              </label>
              <Input
                id="exam-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={disabled}
                className="h-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exam-location" className="mb-1.5 block text-sm font-medium text-foreground">
              考场
            </label>
            <div className="relative">
              <Input
                id="exam-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="选填"
                disabled={disabled}
                className="h-10 pl-9"
              />
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <Button type="submit" disabled={disabled || !canSubmit} className="h-10 w-full">
            <Plus className="size-4" />
            添加考试
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── 考试列表项 ───────────────────────────────────────────────

function ExamItem({
  exam,
  onComplete,
  onUncomplete,
  onDelete,
}: {
  exam: Exam;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cd = formatCountdown(exam.date);
  const isCompleted = exam.status === "completed";
  const style = urgencyStyle[cd.urgency];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40">
      {isCompleted ? (
        <button
          type="button"
          onClick={() => onUncomplete(exam.id)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-label={`取消「${exam.subject}」的完成状态`}
          title="撤销完成"
        >
          <CheckCircle2 className="size-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onComplete(exam.id)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground/60 transition-colors hover:border-primary hover:text-primary"
          aria-label={`标记「${exam.subject}」已完成`}
          title="标记完成"
        >
          <Circle className="size-5" />
        </button>
      )}

      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        <Clock className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-medium truncate ${
            isCompleted ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {exam.subject}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{exam.date}</span>
          {exam.time && <span>{exam.time}</span>}
          {exam.location && <span>{exam.location}</span>}
          {exam.source === "jwgl" && <Badge variant="secondary">教务</Badge>}
          {isCompleted && exam.completedAt && (
            <span>
              完成于{" "}
              {new Date(exam.completedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!isCompleted && (
          <Badge
            variant="secondary"
            className={`tabular-nums text-xs font-semibold ${urgencyColor[cd.urgency]}`}
          >
            {cd.text}
          </Badge>
        )}

        {isCompleted ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onUncomplete(exam.id)}
              className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="撤销完成"
              title="撤销完成"
            >
              <RotateCcw className="size-4" />
            </Button>
            {exam.source === "manual" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`删除「${exam.subject}」`}
                title="删除"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`删除「${exam.subject}」`}
            title="删除"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除考试"
        description={`确定要删除「${exam.subject}」吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={() => onDelete(exam.id)}
      />
    </div>
  );
}

// ── 主组件 ───────────────────────────────────────────────────

export default function ExamsPage() {
  const { schoolId, userId } = useAuthStore((s) => s);

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const autoImportedRef = useRef(false);
  const pendingDeleteRef = useRef<{ exam: Exam; timer: ReturnType<typeof setTimeout> } | null>(null);

  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;

  const subjects = useMemo(() => {
    const titles = schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    return Array.from(new Set(titles)).filter((s): s is string => Boolean(s)).sort();
  }, [schedule]);

  // ── 数据加载 ─────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const data = await apiGet(schoolId, userId);
    setExams(data);
  }, [schoolId, userId]);

  const rollbackRef = useRef<Exam[] | null>(null);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        showToast("error", err instanceof Error ? err.message : "加载考试失败");
      })
      .then(async () => {
        // 首次进入页面时自动尝试从教务同步考试数据
        // 延迟到下一帧执行，避免阻塞首屏渲染和导航交互
        if (autoImportedRef.current) return;
        autoImportedRef.current = true;
        requestAnimationFrame(() => {
          setImporting(true);
          apiImportJwgl(schoolId, userId)
            .then(async ({ added }) => {
              if (added > 0) {
                await refresh();
                showToast("success", `已自动导入 ${added} 场考试`);
              }
            })
            .catch(() => {
              showToast("error", "教务数据同步失败");
            })
            .finally(() => setImporting(false));
        });
      })
      .finally(() => setLoading(false));
  }, [refresh, schoolId, userId]);

  // 组件卸载时刷新待删除缓冲，确保删除操作最终落盘
  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        apiDelete(pendingDeleteRef.current.exam.id, schoolId, userId);
        pendingDeleteRef.current = null;
      }
    };
  }, [schoolId, userId]);

  // ── 操作 ─────────────────────────────────────────────────

  const handleAdd = async (payload: Omit<Exam, "id" | "source" | "status">) => {
    const optimistic: Exam = {
      id: `pending-${Date.now()}`,
      ...payload,
      source: "manual",
      status: "upcoming",
    };
    setExams((prev) => {
      rollbackRef.current = prev;
      return [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date));
    });

    try {
      const created = await apiAdd(payload, schoolId, userId);
      setExams((prev) => prev.map((e) => (e.id === optimistic.id ? created : e)));
      showToast("success", "已添加考试");
    } catch (err) {
      setExams(rollbackRef.current ?? []);
      showToast("error", err instanceof Error ? err.message : "添加考试失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleComplete = async (id: string) => {
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) => (e.id === id ? { ...e, status: "completed", completedAt: Date.now() } : e));
    });
    try {
      await apiPatch(id, "completed", schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "标记完成失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleUncomplete = async (id: string) => {
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) => (e.id === id ? { ...e, status: "upcoming", completedAt: undefined } : e));
    });
    try {
      await apiPatch(id, "upcoming", schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "撤销完成失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleDelete = async (id: string) => {
    const target = exams.find((e) => e.id === id);
    if (!target) return;

    // 手动考试：立即从界面移除，提供撤销Toast
    if (target.source === "manual") {
      setExams((prev) => {
        rollbackRef.current = prev;
        return prev.filter((e) => e.id !== id);
      });

      // 如果已有未过期的待删除项，先立即落盘
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        apiDelete(pendingDeleteRef.current.exam.id, schoolId, userId).catch(() => {});
      }

      const timer = setTimeout(() => {
        apiDelete(target.id, schoolId, userId).catch((err) => {
          if (rollbackRef.current) setExams(rollbackRef.current);
          showToast("error", err instanceof Error ? err.message : "删除考试失败");
        });
        pendingDeleteRef.current = null;
      }, 5000);

      pendingDeleteRef.current = { exam: target, timer };

      toast(`已删除「${target.subject}」`, {
        duration: 5000,
        action: {
          label: "撤销",
          onClick: () => {
            if (pendingDeleteRef.current?.exam.id === target.id) {
              clearTimeout(pendingDeleteRef.current.timer);
              pendingDeleteRef.current = null;
              setExams((prev) => [...prev, target].sort((a, b) => a.date.localeCompare(b.date)));
            }
          },
        },
      });
      return;
    }

    // 教务考试：本地先标记 deleted，再同步服务端
    setExams((prev) => {
      rollbackRef.current = prev;
      return prev.map((e) => (e.id === id ? { ...e, status: "deleted" as const } : e));
    });
    try {
      await apiDelete(id, schoolId, userId);
    } catch (err) {
      if (rollbackRef.current) setExams(rollbackRef.current);
      showToast("error", err instanceof Error ? err.message : "删除考试失败");
    } finally {
      rollbackRef.current = null;
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { added } = await apiImportJwgl(schoolId, userId);
      await refresh();
      if (added > 0) {
        showToast("success", `已导入 ${added} 场考试`);
      } else {
        showToast("info", "没有新考试");
      }
    } catch {
      showToast("error", "教务数据同步失败");
    } finally {
      setImporting(false);
    }
  };

  // ── 分区 ─────────────────────────────────────────────────

  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = visible
    .filter((e) => e.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const headerDescription = loading
    ? "加载中…"
    : upcoming.length > 0
      ? `${todayLabel()} · ${upcoming.length} 场待考`
      : `${todayLabel()} · 暂无待考科目`;

  // 没有待考科目时，默认展开已完成列表，避免用户以为数据丢失
  useEffect(() => {
    if (!loading && upcoming.length === 0 && completed.length > 0) {
      setShowCompleted(true);
    }
  }, [loading, upcoming.length, completed.length]);

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-background text-foreground animate-page pb-24 md:pb-8">
      <PageHeader
        icon={<Clock className="size-5 text-primary" />}
        title="考试"
        description={headerDescription}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={importing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`size-4 ${importing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">同步教务数据</span>
            <span className="sm:hidden">同步</span>
          </Button>
        }
      />

      <div className="space-y-5">
        {loading && (
          <Card hover={false} className="p-4">
            <ListSkeleton count={4} />
          </Card>
        )}

        {!loading && visible.length === 0 && (
          <EmptyState
            icon={Clock}
            title="暂无考试"
            description="在下方添加第一场考试，自动开启倒计时"
          />
        )}

        {!loading && visible.length > 0 && <ExamStats exams={exams} />}

        {!loading && upcoming.length > 0 && (
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">待考</CardTitle>
                <Badge variant="secondary">{upcoming.length} 场</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.map((exam) => (
                <ExamItem
                  key={exam.id}
                  exam={exam}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onDelete={handleDelete}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && completed.length > 0 && (
          <Card hover={false}>
            <CardHeader>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <CardTitle className="text-base text-muted-foreground">已完成</CardTitle>
                <Badge variant="secondary">{completed.length} 场</Badge>
              </button>
            </CardHeader>
            {showCompleted && (
              <CardContent className="space-y-2">
                {completed.map((exam) => (
                  <ExamItem
                    key={exam.id}
                    exam={exam}
                    onComplete={handleComplete}
                    onUncomplete={handleUncomplete}
                    onDelete={handleDelete}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        <QuickAddForm subjects={subjects} onAdd={handleAdd} disabled={loading} />
      </div>
    </div>
  );
}
