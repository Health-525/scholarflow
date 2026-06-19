"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { showToast } from "@/components/ui/ToastContainer";
import { useAssignmentsQuery, useScheduleQuery } from "@/hooks/useQueries";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { Assignment, AssignmentDraft } from "@/types";

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateToDeadline(date: string): string {
  return `${date}T23:59`;
}

function classifyAssignment(
  a: Assignment,
  now: number
): "overdue" | "today" | "future" | "done" {
  if (a.done) return "done";
  if (!a.deadline) return "future";
  const ms = new Date(a.deadline).getTime() - now;
  if (ms < 0) return "overdue";
  if (ms < 86400000) return "today";
  return "future";
}

function daysUntil(a: Assignment, now: number): number | null {
  if (!a.deadline || a.done) return null;
  const ms = new Date(a.deadline).getTime() - now;
  if (ms < 0) return null;
  return Math.ceil(ms / 86400000);
}

function formatDateLabel(d = new Date()): string {
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type Filter = "all" | "pending" | "today" | "overdue" | "completed";
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
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const style = TONE_STYLES[tone];
  return (
    <Card
      hover={false}
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all",
        active && "ring-2 ring-primary/30"
      )}
    >
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

type FormValues = AssignmentInput;

// ── Quick capture ──
function QuickCaptureForm({
  subjects,
  onAdd,
}: {
  subjects: string[];
  onAdd: (d: AssignmentDraft) => Promise<Assignment[]>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      subject: subjects[0] || "",
      title: "",
      deadline: tomorrowDate(),
    },
  });

  const subjectValue = watch("subject");

  const onSubmit = async (data: FormValues) => {
    try {
      await onAdd({
        subject: data.subject.trim(),
        title: data.title.trim(),
        deadline: dateToDeadline(data.deadline),
      });
      showToast("success", "作业已添加");
      reset({
        subject: subjects[0] || "",
        title: "",
        deadline: tomorrowDate(),
      });
      const el = document.getElementById("title") as HTMLInputElement | null;
      el?.focus();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "添加失败");
    }
  };

  return (
    <Card className="!overflow-visible">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="title"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              作业标题
            </label>
            <Input
              id="title"
              {...register("title")}
              placeholder="请输入作业名称"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
                }
              }}
            />
            {errors.title && (
              <p className="mt-1 text-[12px] text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">科目</span>
              <SubjectSelector
                subjects={subjects}
                value={subjectValue}
                onChange={(v) => setValue("subject", v, { shouldValidate: true })}
                className="max-h-32 overflow-y-auto"
              />
              {errors.subject && (
                <p className="mt-1 text-[12px] text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="deadline"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                截止日期
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="deadline"
                  type="date"
                  {...register("deadline")}
                  className="h-10 pl-9"
                />
              </div>
              {errors.deadline && (
                <p className="mt-1 text-[12px] text-destructive">{errors.deadline.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="h-10 gap-1">
              <Plus className="size-4" />
              添加
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── AssignmentList ──
function AssignmentList({
  assignments,
  filter,
  subjects,
  onMarkDone,
  onUpdate,
  onDelete,
  undoBuffer,
  onUndo,
  onResetFilter,
}: {
  assignments: Assignment[];
  filter: Filter;
  subjects: string[];
  onMarkDone: (id: string) => Promise<unknown>;
  onUpdate: (id: string, draft: AssignmentDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;
  onUndo: () => Promise<void>;
  onResetFilter: () => void;
}) {
  const now = Date.now();
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue");
  const today = assignments.filter((a) => classifyAssignment(a, now) === "today");
  const future = assignments.filter((a) => classifyAssignment(a, now) === "future");
  const completed = assignments.filter((a) => a.done);
  const pending = [...overdue, ...today, ...future];

  const visibleGroups = (() => {
    switch (filter) {
      case "pending":
        return [{ title: "待完成", items: pending }];
      case "today":
        return [{ title: "今天截止", items: today }];
      case "overdue":
        return [{ title: "已逾期", items: overdue }];
      case "completed":
        return [{ title: "已完成", items: completed }];
      default:
        return [
          { title: "待完成", items: pending },
          { title: "已完成", items: completed },
        ];
    }
  })();

  const totalVisible = visibleGroups.reduce((sum, g) => sum + g.items.length, 0);

  if (assignments.length === 0) {
    return null;
  }

  if (totalVisible === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="没有符合条件的作业"
        description="点击统计卡片可重置筛选"
        action={{ label: "显示全部", onClick: onResetFilter }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Undo toast */}
      {undoBuffer && Date.now() < undoBuffer.expiresAt && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-fade-up">
          <span className="flex-1 truncate">已完成「{undoBuffer.assignment.title}」</span>
          <Button variant="secondary" size="sm" onClick={onUndo} className="gap-1">
            <RotateCcw size={12} /> 撤销
          </Button>
        </div>
      )}

      {visibleGroups.map(
        (group) =>
          group.items.length > 0 && (
            <Card hover={false} key={group.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[13px]">{group.title}</CardTitle>
                  <Badge variant="secondary">{group.items.length} 项</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((a) => (
                  <AssignmentItem
                    key={a.id}
                    a={a}
                    now={now}
                    type={classifyAssignment(a, now)}
                    subjects={subjects}
                    onMarkDone={onMarkDone}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </CardContent>
            </Card>
          )
      )}
    </div>
  );
}

function AssignmentItem({
  a,
  now,
  type,
  subjects,
  onMarkDone,
  onUpdate,
  onDelete,
}: {
  a: Assignment;
  now: number;
  type: "overdue" | "today" | "future" | "done";
  subjects: string[];
  onMarkDone: (id: string) => Promise<unknown>;
  onUpdate: (id: string, draft: AssignmentDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditRow
        a={a}
        subjects={subjects}
        onSave={async (draft) => {
          await onUpdate(a.id, draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const isDone = a.done;
  const statusText = isDone
    ? "已完成"
    : type === "overdue"
      ? "已逾期"
      : type === "today"
        ? "今天截止"
        : `剩余 ${daysUntil(a, now) ?? 0} 天`;
  const statusVariant =
    isDone ? "secondary" : type === "overdue" ? "destructive" : type === "today" ? "default" : "secondary";

  const accentColor =
    type === "overdue"
      ? "var(--status-error)"
      : type === "today"
        ? "var(--status-warning)"
        : "transparent";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40",
        type !== "future" && type !== "done" && "border-l-4"
      )}
      style={{ borderLeftColor: accentColor }}
    >
      <button
        onClick={() => onMarkDone(a.id)}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          isDone
            ? "bg-emerald-500/15 border-emerald-500/30"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        aria-label={isDone ? "撤销完成" : "标记完成"}
      >
        {isDone ? (
          <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Check size={12} className="opacity-0 group-hover:opacity-40 text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isDone && "line-through text-muted-foreground"
          )}
        >
          {a.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
            <BookOpen size={10} /> {a.subject}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays size={10} />
            {formatDeadline(a.deadline)}
          </span>
        </div>
      </div>

      <Badge variant={statusVariant}>{statusText}</Badge>

      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isDone && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            className="size-8"
            title="编辑"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={async () => {
            try {
              await onDelete(a.id);
              showToast("success", "作业已删除");
            } catch (err) {
              showToast("error", err instanceof Error ? err.message : "删除失败");
            }
          }}
          className="size-8"
          title="删除"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function EditRow({
  a,
  subjects,
  onSave,
  onCancel,
}: {
  a: Assignment;
  subjects: string[];
  onSave: (draft: AssignmentDraft) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      title: a.title,
      subject: a.subject,
      deadline: a.deadline.slice(0, 10),
    },
  });

  const subjectValue = watch("subject");

  const onSubmit = async (data: FormValues) => {
    await onSave({
      subject: data.subject.trim(),
      title: data.title.trim(),
      deadline: dateToDeadline(data.deadline),
      note: a.note,
    });
    showToast("success", "作业已更新");
  };

  return (
    <Card className="!overflow-visible bg-muted/30">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Input {...register("title")} placeholder="作业标题" className="h-10" />
          {errors.title && (
            <p className="text-[12px] text-destructive">{errors.title.message}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SubjectSelector
              subjects={subjects}
              value={subjectValue}
              onChange={(v) => setValue("subject", v, { shouldValidate: true })}
              className="max-h-32 overflow-y-auto"
            />
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input type="date" {...register("deadline")} className="h-10 pl-9" />
            </div>
          </div>
          {(errors.subject || errors.deadline) && (
            <p className="text-[12px] text-destructive">
              {errors.subject?.message || errors.deadline?.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-9">
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 gap-1">
              <CheckCircle2 className="size-4" /> 保存
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Stats summary ──
function AssignmentStats({
  assignments,
  filter,
  onFilter,
}: {
  assignments: Assignment[];
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const now = Date.now();
  const pending = assignments.filter((a) => !a.done).length;
  const completed = assignments.length - pending;
  const dueToday = assignments.filter((a) => classifyAssignment(a, now) === "today").length;
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue").length;

  const set = (f: Filter) => onFilter(filter === f ? "all" : f);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={ClipboardList}
        label="待完成"
        value={pending}
        tone="primary"
        active={filter === "pending"}
        onClick={() => set("pending")}
      />
      <StatCard
        icon={CalendarDays}
        label="今天截止"
        value={dueToday}
        tone={dueToday > 0 ? "warning" : "primary"}
        active={filter === "today"}
        onClick={() => set("today")}
      />
      <StatCard
        icon={AlertCircle}
        label="已逾期"
        value={overdue}
        tone={overdue > 0 ? "danger" : "primary"}
        active={filter === "overdue"}
        onClick={() => set("overdue")}
      />
      <StatCard
        icon={CheckCircle2}
        label="已完成"
        value={completed}
        tone="success"
        active={filter === "completed"}
        onClick={() => set("completed")}
      />
    </div>
  );
}

// ── Page ──
export default function AssignmentsPage() {
  const {
    assignments,
    isLoading,
    error,
    add,
    markDone,
    update,
    delete: deleteAssignment,
    undoBuffer,
    undo,
    reload,
  } = useAssignmentsQuery();
  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;
  const [filter, setFilter] = useState<Filter>("all");

  const subjects = useMemo(() => {
    const titles = schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    return Array.from(new Set(titles)).filter((s): s is string => Boolean(s)).sort();
  }, [schedule]);

  const headerDescription = useMemo(() => {
    const pending = assignments.filter((a) => !a.done).length;
    const status = pending === 0 ? "所有作业已完成" : `还剩 ${pending} 项作业`;
    return `今天是 ${formatDateLabel()} · ${status}`;
  }, [assignments]);

  const focusInput = () => {
    const el = document.getElementById("title") as HTMLInputElement | null;
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleUpdate = useCallback(
    async (id: string, draft: AssignmentDraft) => {
      await update({ id, draft });
    },
    [update]
  );

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-background text-foreground animate-page">
      <PageHeader
        icon={<ClipboardList className="size-5 text-primary" />}
        title="作业"
        description={headerDescription}
      />

      <div className="pb-8 space-y-5">
        {isLoading && (
          <Card hover={false} className="p-4">
            <ListSkeleton count={4} />
          </Card>
        )}

        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

        {!isLoading && !error && (
          <>
            <AssignmentStats assignments={assignments} filter={filter} onFilter={setFilter} />

            {assignments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="暂无待办作业"
                description="添加一条作业，开始规划你的学习任务"
                action={{ label: "添加作业", onClick: focusInput }}
              />
            ) : (
              <AssignmentList
                assignments={assignments}
                filter={filter}
                subjects={subjects}
                onMarkDone={markDone}
                onUpdate={handleUpdate}
                onDelete={deleteAssignment}
                undoBuffer={undoBuffer}
                onUndo={undo}
                onResetFilter={() => setFilter("all")}
              />
            )}
          </>
        )}

        <QuickCaptureForm subjects={subjects} onAdd={add} />
      </div>
    </div>
  );
}
