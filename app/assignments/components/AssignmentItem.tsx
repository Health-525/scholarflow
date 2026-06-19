"use client";

import { BookOpen, CalendarDays, Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/ToastContainer";
import { cn } from "@/lib/utils";
import type { Assignment, AssignmentDraft } from "@/types";

import { classifyAssignment, daysUntil, formatDeadline } from "../utils";
import { EditRow } from "./EditRow";

export function AssignmentItem({
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

      <div className="flex shrink-0 items-center gap-0.5">
        {!isDone && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            className="size-8 text-muted-foreground/50 hover:text-primary"
            title="编辑"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteConfirm(true)}
          className="size-8 text-muted-foreground/50 hover:text-destructive"
          title="删除"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除作业"
        description={`确定要删除「${a.title}」吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={async () => {
          try {
            await onDelete(a.id);
            showToast("success", "作业已删除");
          } catch (err) {
            showToast("error", err instanceof Error ? err.message : "删除失败");
          }
        }}
      />
    </div>
  );
}
