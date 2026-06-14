"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Check, RotateCcw, Plus, X, Calendar, BookOpen, GripVertical } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SortableList } from "@/components/ui/SortableList";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import type { Assignment, AssignmentDraft } from "@/types";

// ── AddAssignmentForm ──
function AddAssignmentForm({ onAdd, onCancel }: { onAdd: (d: AssignmentDraft) => Promise<Assignment[]>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { subject: "", title: "", deadline: "" },
  });

  const onSubmit = async (data: AssignmentInput) => {
    await onAdd(data);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl p-4 space-y-3 bg-card border border-border" noValidate>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">新增作业</span>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X size={14} /></button>
      </div>
      <div>
        <input {...register("subject")} placeholder="课程名"
          className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30" />
        {errors.subject && <p className="mt-1 text-[11px] text-red-500">{errors.subject.message}</p>}
      </div>
      <div>
        <input {...register("title")} placeholder="作业内容"
          className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30" />
        {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>}
      </div>
      <div>
        <input type="datetime-local" {...register("deadline")}
          className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground outline-none focus:border-primary/30" />
        {errors.deadline && <p className="mt-1 text-[11px] text-red-500">{errors.deadline.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
        className={`w-full py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary transition-opacity ${isSubmitting ? "opacity-60" : ""}`}>
        {isSubmitting ? "添加中..." : "添加"}
      </button>
    </form>
  );
}

// ── AssignmentList ──
function AssignmentList({ assignments, onMarkDone, onReorder, undoBuffer, onUndo }: {
  assignments: Assignment[];
  onMarkDone: (id: string) => Promise<unknown>;
  onReorder: (next: Assignment[]) => Promise<unknown>;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;
  onUndo: () => Promise<void>;
}) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">暂无作业</p>
        <p className="text-xs mt-1">点击右上角「+ 新增」添加</p>
      </div>
    );
  }

  const now = Date.now();
  const pending = assignments.filter(a => !a.done);
  const completed = assignments.filter(a => a.done);

  return (
    <div className="space-y-4">
      {/* Undo toast */}
      {undoBuffer && Date.now() < undoBuffer.expiresAt && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm animate-fade-up bg-emerald-500/10 text-emerald-600">
          <span className="flex-1">已完成「{undoBuffer.assignment.title}」</span>
          <button onClick={onUndo} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-emerald-500/15">
            <RotateCcw size={12} />撤销
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">待处理 ({pending.length})</h3>
          <SortableList
            items={pending}
            onReorder={async (nextPending) => {
              const next = nextPending.map((a, i) => ({ ...a, order: (nextPending.length - i) * 1000 }));
              const rest = assignments.filter(a => a.done);
              await onReorder([...next, ...rest]);
            }}
            itemClassName="group"
            renderItem={(a) => {
              const isUrgent = a.deadline && new Date(a.deadline).getTime() - now < 86400000;
              const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - now) / 86400000) : null;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-card ${isUrgent ? "border border-rose-500/30" : "border border-border"}`}>
                  <button onClick={() => onMarkDone(a.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isUrgent ? "border-rose-500" : "border-muted-foreground/40 hover:border-primary"}`}
                    aria-label="标记完成">
                    <Check size={12} className="opacity-0 group-hover:opacity-50" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{a.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                        <BookOpen size={10} />{a.subject}
                      </span>
                      {a.deadline && (
                        <span className={`text-[11px] flex items-center gap-1 ${daysLeft !== null && daysLeft < 0 ? "text-red-500 font-medium" : isUrgent ? "text-rose-500" : "text-muted-foreground"}`}>
                          <Calendar size={10} />{daysLeft !== null ? (daysLeft < 0 ? `逾期${Math.abs(daysLeft)}天` : daysLeft === 0 ? "今天截止" : `${daysLeft}天`) : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            renderDragOverlay={(a) => {
              const isUrgent = a.deadline && new Date(a.deadline).getTime() - now < 86400000;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-card shadow-lg ${isUrgent ? "border border-rose-500/30" : "border border-border"}`}>
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{a.title}</p>
                    <span className="text-[11px] text-muted-foreground">{a.subject}</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">已完成 ({completed.length})</h3>
          {completed.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-50 bg-card border border-border">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
                <Check size={12} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-through truncate text-muted-foreground">{a.title}</p>
                <span className="text-[11px] text-muted-foreground">{a.subject}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──
export default function AssignmentsPage() {
  const { assignments, isLoading, error, add, markDone, reorder, undoBuffer, undo, reload } = useAssignmentsQuery();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 py-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/10">
          <ClipboardList className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">作业</h1>
          <p className="text-[12px] text-muted-foreground">作业管理与截止提醒</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 shrink-0">
          <Plus size={14} />{showForm ? "收起" : "新增"}
        </button>
      </div>

      <div className="pb-6">
        {showForm && <div className="mb-4"><AddAssignmentForm onAdd={add} onCancel={() => setShowForm(false)} /></div>}
        {isLoading && <div className="py-12"><LoadingSpinner label="加载作业..." /></div>}
        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}
        {!isLoading && !error && <AssignmentList assignments={assignments} onMarkDone={markDone} onReorder={reorder} undoBuffer={undoBuffer} onUndo={undo} />}
      </div>
    </div>
  );
}
