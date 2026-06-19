"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Check, RotateCcw, Plus, Calendar, BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useAssignmentsQuery, useScheduleQuery } from "@/hooks/useQueries";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/types";

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

const OTHER_KEY = "__other__";

// ── Quick capture ──
function QuickCaptureForm({
  subjects,
  onAdd,
}: {
  subjects: string[];
  onAdd: (d: AssignmentInput) => Promise<Assignment[]>;
}) {
  const [expanded, setExpanded] = useState(false);
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
    await onAdd({
      subject: subject.trim(),
      title: data.title,
      deadline: dateToDeadline(data.deadline),
    });
    reset({
      subject: hasSubjects ? subjects[0] : "",
      customSubject: "",
      title: "",
      deadline: tomorrowDate(),
    });
    setExpanded(false);
  };

  return (
    <Card className="hover:shadow-sm hover:translate-y-0">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {/* 始终显示的快速输入行 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="title"
                {...register("title")}
                placeholder="添加新作业…"
                className="h-11 pl-9 border-dashed focus:border-solid"
                onFocus={() => setExpanded(true)}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="h-11 px-4 shrink-0">
              添加
            </Button>
          </div>

          {/* 展开后显示详细信息 */}
          {expanded && (
            <div className="space-y-3 animate-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="subject"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    科目
                  </label>
                  {hasSubjects ? (
                    <div className="space-y-2">
                      <select
                        id="subject"
                        {...register("subject")}
                        onChange={(e) => {
                          setValue("subject", e.target.value, { shouldValidate: true });
                          if (e.target.value !== OTHER_KEY)
                            setValue("customSubject", "", { shouldValidate: false });
                        }}
                        className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      >
                        <option value="" disabled>
                          选择科目
                        </option>
                        {subjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value={OTHER_KEY}>其他…</option>
                      </select>
                      {isOther && (
                        <Input
                          {...register("customSubject")}
                          placeholder="输入科目"
                          className="h-11"
                        />
                      )}
                    </div>
                  ) : (
                    <Input
                      id="subject"
                      {...register("subject")}
                      placeholder="科目"
                      className="h-11"
                    />
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
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="deadline"
                      type="date"
                      {...register("deadline")}
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
              </div>

              {(errors.subject || errors.customSubject || errors.title || errors.deadline) && (
                <p className="text-[12px] text-destructive">
                  {errors.subject?.message ||
                    errors.customSubject?.message ||
                    errors.title?.message ||
                    errors.deadline?.message}
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
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
          <p className="text-xs mt-1 text-muted-foreground">在下方添加第一条作业</p>
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
          <CardContent className="space-y-2">
            {overdue.map((a) => (
              <AssignmentItem key={a.id} a={a} now={now} type="overdue" onMarkDone={onMarkDone} />
            ))}
            {today.map((a) => (
              <AssignmentItem key={a.id} a={a} now={now} type="today" onMarkDone={onMarkDone} />
            ))}
            {future.map((a) => (
              <AssignmentItem key={a.id} a={a} now={now} type="future" onMarkDone={onMarkDone} />
            ))}
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <Card className="hover:shadow-sm hover:translate-y-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] text-muted-foreground">已完成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completed.map((a) => (
              <Card
                key={a.id}
                className="flex items-center gap-3 p-3 opacity-60 hover:shadow-sm hover:translate-y-0"
                hover={false}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate text-muted-foreground">{a.title}</p>
                  <span className="text-[11px] text-muted-foreground">{a.subject}</span>
                </div>
              </Card>
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
    <Card
      className={cn(
        "group flex items-center gap-3 p-3 hover:shadow-sm hover:translate-y-0",
        type === "overdue"
          ? "border-l-4 border-l-destructive"
          : type === "today"
            ? "border-l-4 border-l-amber-500"
            : "border-l-4 border-l-transparent"
      )}
      hover={false}
    >
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
    </Card>
  );
}

// ── Stats summary ──
function AssignmentStats({ assignments }: { assignments: Assignment[] }) {
  const now = Date.now();
  const total = assignments.length;
  const pending = assignments.filter((a) => !a.done).length;
  const completed = total - pending;
  const dueToday = assignments.filter((a) => classifyAssignment(a, now) === "today").length;
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const items = [
    { label: "待完成", value: pending, color: "text-foreground" },
    { label: "今天截止", value: dueToday, color: dueToday > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "已逾期", value: overdue, color: overdue > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "已完成", value: completed, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <Card className="hover:shadow-sm hover:translate-y-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">完成进度</span>
          <span className="text-sm font-bold text-foreground">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</div>
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──
export default function AssignmentsPage() {
  const { assignments, isLoading, error, add, markDone, undoBuffer, undo, reload } =
    useAssignmentsQuery();
  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;

  const subjects = useMemo(() => {
    const titles = schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    return Array.from(new Set(titles)).filter((s): s is string => Boolean(s)).sort();
  }, [schedule]);

  const headerSubtitle = useMemo(() => {
    const pending = assignments.filter((a) => !a.done).length;
    if (pending === 0) return "所有作业已完成";
    return `还剩 ${pending} 项作业`;
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
          <p className="text-[12px] text-muted-foreground">{headerSubtitle}</p>
        </div>
      </div>

      <div className="pb-8 space-y-5">
        {!isLoading && !error && <AssignmentStats assignments={assignments} />}

        {isLoading && (
          <Card className="p-4 hover:shadow-sm hover:translate-y-0">
            <ListSkeleton count={4} />
          </Card>
        )}
        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}
        {!isLoading && !error && (
          <AssignmentList
            assignments={assignments}
            onMarkDone={markDone}
            undoBuffer={undoBuffer}
            onUndo={undo}
          />
        )}

        <QuickCaptureForm subjects={subjects} onAdd={add} />
      </div>
    </div>
  );
}
