"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Check, RotateCcw, Plus, Calendar, BookOpen, AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAssignmentsQuery, useScheduleQuery } from "@/hooks/useQueries";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import type { Assignment } from "@/types";

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateToDeadline(date: string): string {
  return `${date}T23:59`;
}

function classifyAssignment(a: Assignment, now: number): "overdue" | "today" | "future" | "done" {
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

const OTHER_KEY = "__other__";

// ── Quick capture ──
function QuickCaptureForm({
  subjects,
  onAdd,
}: {
  subjects: string[];
  onAdd: (d: AssignmentInput) => Promise<Assignment[]>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentInput & { customSubject?: string }>({
    resolver: zodResolver(
      assignmentSchema.extend({
        customSubject: assignmentSchema.shape.subject.optional(),
      })
    ),
    mode: "onBlur",
    defaultValues: { subject: "", customSubject: "", title: "", deadline: tomorrowDate() },
  });

  const subjectValue = watch("subject");
  const isOther = subjectValue === OTHER_KEY;
  const hasSubjects = subjects.length > 0;

  const onSubmit = async (data: AssignmentInput & { customSubject?: string }) => {
    const subject = isOther ? data.customSubject || "" : data.subject;
    if (!subject.trim()) {
      return;
    }
    await onAdd({ subject: subject.trim(), title: data.title, deadline: dateToDeadline(data.deadline) });
    reset({
      subject: hasSubjects ? subjects[0] : "",
      customSubject: "",
      title: "",
      deadline: tomorrowDate(),
    });
  };

  return (
    <Card className="p-1 hover:shadow-sm hover:translate-y-0">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-2 md:gap-1" noValidate>
        <div className="flex-1 md:min-w-[150px]">
          <label htmlFor="subject" className="sr-only">科目</label>
          {hasSubjects ? (
            <>
              <select
                id="subject"
                {...register("subject")}
                onChange={(e) => {
                  setValue("subject", e.target.value, { shouldValidate: true });
                  if (e.target.value !== OTHER_KEY) setValue("customSubject", "", { shouldValidate: false });
                }}
                className="h-11 w-full rounded-xl md:rounded-r-none border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="" disabled>选择科目</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value={OTHER_KEY}>其他…</option>
              </select>
              {isOther && (
                <Input
                  {...register("customSubject")}
                  placeholder="输入科目"
                  className="mt-1.5 md:hidden h-10"
                />
              )}
            </>
          ) : (
            <Input
              id="subject"
              {...register("subject")}
              placeholder="科目"
              className="h-11 rounded-xl md:rounded-r-none"
            />
          )}
        </div>

        {isOther && (
          <div className="hidden md:block md:w-[150px]">
            <label htmlFor="customSubject" className="sr-only">自定义科目</label>
            <Input
              id="customSubject"
              {...register("customSubject")}
              placeholder="输入科目"
              className="h-11 rounded-xl md:rounded-none"
            />
          </div>
        )}

        <div className="flex-[2]">
          <label htmlFor="title" className="sr-only">作业内容</label>
          <Input
            id="title"
            {...register("title")}
            placeholder="作业内容，例如：完成第3章习题"
            className="h-11 rounded-xl md:rounded-none"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-1">
          <div className="w-full md:w-auto relative">
            <label htmlFor="deadline" className="sr-only">截止日期</label>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="deadline"
              type="date"
              {...register("deadline")}
              className="h-11 pl-9 rounded-xl md:rounded-l-none md:rounded-r-none"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-11 px-5 rounded-xl shrink-0">
            <Plus size={16} /> <span className="hidden sm:inline ml-1.5">添加</span>
          </Button>
        </div>
      </form>
      {(errors.subject || errors.customSubject || errors.title || errors.deadline) && (
        <div className="px-3 pb-2 pt-2 text-[11px] text-destructive">
          {errors.subject?.message || errors.customSubject?.message || errors.title?.message || errors.deadline?.message}
        </div>
      )}
    </Card>
  );
}

// ── AssignmentList ──
function AssignmentList({
  assignments,
  onMarkDone,
  undoBuffer,
  onUndo,
}: {
  assignments: Assignment[];
  onMarkDone: (id: string) => Promise<unknown>;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;
  onUndo: () => Promise<void>;
}) {
  const now = Date.now();
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue");
  const today = assignments.filter((a) => classifyAssignment(a, now) === "today");
  const future = assignments.filter((a) => classifyAssignment(a, now) === "future");
  const completed = assignments.filter((a) => a.done);
  const pending = [...overdue, ...today, ...future];

  if (assignments.length === 0) {
    return (
      <Card className="py-14 hover:shadow-sm hover:translate-y-0">
        <CardContent className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-500/10">
            <ClipboardList className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-medium text-foreground">暂无作业</p>
          <p className="text-xs mt-1 text-muted-foreground">在上方选择科目并添加第一条作业</p>
        </CardContent>
      </Card>
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

      {pending.length > 0 && (
        <Card className="hover:shadow-sm hover:translate-y-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px]">待完成</CardTitle>
              <Badge variant="secondary">{pending.length} 项</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {overdue.map((a) => <AssignmentItem key={a.id} a={a} now={now} type="overdue" onMarkDone={onMarkDone} />)}
            {today.map((a) => <AssignmentItem key={a.id} a={a} now={now} type="today" onMarkDone={onMarkDone} />)}
            {future.map((a) => <AssignmentItem key={a.id} a={a} now={now} type="future" onMarkDone={onMarkDone} />)}
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <Card className="hover:shadow-sm hover:translate-y-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] text-muted-foreground">已完成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {completed.map((a) => (
              <div key={a.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-60 hover:bg-muted/40 transition-colors">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate text-muted-foreground">{a.title}</p>
                  <span className="text-[11px] text-muted-foreground">{a.subject}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AssignmentItem({
  a,
  now,
  type,
  onMarkDone,
}: {
  a: Assignment;
  now: number;
  type: "overdue" | "today" | "future";
  onMarkDone: (id: string) => Promise<unknown>;
}) {
  const days = daysUntil(a, now);
  const dueBadge =
    type === "overdue"
      ? { text: "已逾期", variant: "destructive" as const }
      : type === "today"
      ? { text: "今天", variant: "default" as const }
      : { text: `${days} 天`, variant: "secondary" as const };

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/40 transition-colors">
      <button
        onClick={() => onMarkDone(a.id)}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors border-muted-foreground/30 hover:border-primary"
        aria-label="标记完成"
      >
        <Check size={12} className="opacity-0 group-hover:opacity-40" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{a.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
            <BookOpen size={10} /> {a.subject}
          </span>
        </div>
      </div>
      <Badge variant={dueBadge.variant}>{dueBadge.text}</Badge>
    </div>
  );
}

// ── Page ──
export default function AssignmentsPage() {
  const { assignments, isLoading, error, add, markDone, undoBuffer, undo, reload } = useAssignmentsQuery();
  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;

  const subjects = useMemo(() => {
    const titles = schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    return Array.from(new Set(titles)).filter((s): s is string => Boolean(s)).sort();
  }, [schedule]);

  const stats = useMemo(() => {
    const now = Date.now();
    const pending = assignments.filter((a) => !a.done).length;
    const dueToday = assignments.filter((a) => classifyAssignment(a, now) === "today").length;
    return { pending, dueToday };
  }, [assignments]);

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-background text-foreground animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 py-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/10 shadow-sm">
          <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">作业</h1>
          <p className="text-[12px] text-muted-foreground">
            {stats.dueToday > 0 ? `今天有 ${stats.dueToday} 项作业截止` : stats.pending > 0 ? `还剩 ${stats.pending} 项作业` : "所有作业已完成"}
          </p>
        </div>
        {stats.dueToday > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle size={12} /> 今天 {stats.dueToday}
          </Badge>
        )}
      </div>

      <div className="pb-8 space-y-5">
        <QuickCaptureForm subjects={subjects} onAdd={add} />

        {isLoading && (
          <div className="py-12">
            <LoadingSpinner label="加载作业..." />
          </div>
        )}
        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}
        {!isLoading && !error && (
          <AssignmentList assignments={assignments} onMarkDone={markDone} undoBuffer={undoBuffer} onUndo={undo} />
        )}
      </div>
    </div>
  );
}
