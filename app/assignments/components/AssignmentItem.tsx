"use client";

import { BookOpen, CalendarDays, Check, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/ToastContainer";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/types";

import { daysUntil, formatDeadline } from "../utils";

const accentColor: Record<string, string> = {
  overdue: "var(--status-error)",
  today: "var(--status-warning)",
  future: "var(--primary)",
  done: "var(--status-success)",
};

const urgencyStyle: Record<string, { bg: string; color: string }> = {
  overdue: { bg: "rgba(var(--status-error-rgb), 0.1)", color: "var(--status-error)" },
  today: { bg: "rgba(var(--status-warning-rgb), 0.1)", color: "var(--status-warning)" },
  future: { bg: "rgba(var(--primary-rgb), 0.08)", color: "var(--primary)" },
  done: { bg: "rgba(var(--status-success-rgb), 0.1)", color: "var(--status-success)" },
};

export function AssignmentItem({
  a,
  now,
  type,
  onMarkDone,
  onDelete,
}: {
  a: Assignment;
  now: number;
  type: "overdue" | "today" | "future" | "done";
  onMarkDone: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const prevDone = useRef(a.done);

  useEffect(() => {
    if (!prevDone.current && a.done) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 600);
      return () => clearTimeout(t);
    }
    prevDone.current = a.done;
  }, [a.done]);

  const isDone = a.done;
  const days = daysUntil(a, now);
  const style = urgencyStyle[type];

  const statusText = isDone
    ? ""
    : type === "overdue"
      ? "已逾期"
      : type === "today"
        ? "今天截止"
        : days === 1
          ? "明天"
          : `${days} 天`;

  const handleComplete = async () => {
    setAnimating(true);
    await onMarkDone(a.id);
    setTimeout(() => setAnimating(false), 350);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200 hover:bg-muted/40 min-h-[52px]",
        isDone ? "opacity-70 border-border/60" : "border-border"
      )}
    >
      {/* 左侧紧急度色条 */}
      <div
        className="w-[3px] self-stretch rounded-full shrink-0"
        style={{ backgroundColor: accentColor[type], opacity: type === "future" ? 0.3 : type === "done" ? 0.4 : 1 }}
      />

      {/* 完成圆圈 */}
      <button
        type="button"
        onClick={handleComplete}
        className={cn(
          "relative grid place-items-center size-11 shrink-0 rounded-full cursor-pointer transition-all duration-300 ease-out",
          animating && "animate-check-bounce"
        )}
        aria-label={isDone ? "撤销完成" : "标记完成"}
        title={isDone ? "撤销完成" : "标记完成"}
      >
        {/* 视觉圆圈层 */}
        <div
          className={cn(
            "relative size-[22px] rounded-full grid place-items-center transition-all duration-300",
            isDone
              ? "text-white shadow-[0_1px_3px_rgba(var(--status-success-rgb),0.3)]"
              : "border border-muted-foreground/25 group-hover:border-[var(--primary)]/50 group-hover:shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.08)]"
          )}
          style={
            isDone
              ? {
                  background: `linear-gradient(135deg, var(--status-success), color-mix(in srgb, var(--status-success) 80%, #fff))`,
                }
              : undefined
          }
        >
          {/* 完成态光泽 */}
          {isDone && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          )}
          {/* 完成态 check */}
          {isDone && (
            <Check
              className={cn(
                "relative size-3 transition-all duration-200",
                justCompleted ? "scale-110" : "scale-100"
              )}
              strokeWidth={3}
            />
          )}
          {/* 未完成态 hover 底色 */}
          {!isDone && (
            <div className="absolute inset-0 rounded-full bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/8 transition-all duration-300" />
          )}
        </div>
      </button>

      {/* 科目图标 */}
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        <BookOpen className="size-4" />
      </div>

      {/* 内容区域 */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", isDone && "text-muted-foreground line-through")}>
          {a.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{a.subject}</span>
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            {formatDeadline(a.deadline)}
          </span>
          {isDone && a.completedAt && (
            <span>
              完成于{" "}
              {new Date(a.completedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* 右侧操作 */}
      <div className="flex shrink-0 items-center gap-1">
        {statusText && (
          <Badge variant="secondary" className="tabular-nums text-xs font-semibold" style={{ color: style.color }}>
            {statusText}
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteConfirm(true)}
          className="size-8 text-muted-foreground/40 opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:text-[var(--destructive)] transition-opacity duration-150"
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
