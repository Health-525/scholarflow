"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Exam } from "@/types/exam";

// ── 倒计时工具 ───────────────────────────────────────────────

type Urgency = "today" | "soon" | "normal" | "past";

function formatCountdown(dateStr: string): { text: string; urgency: Urgency } {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return { text: "已过期", urgency: "past" };
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days === 0)
    return { text: hours > 0 ? `今天 · ${hours}h后` : "今天", urgency: "today" };
  if (days === 1) return { text: "明天", urgency: "today" };
  if (days <= 3) return { text: `${days} 天后`, urgency: "soon" };
  return { text: `${days} 天后`, urgency: "normal" };
}

const urgencyColor: Record<Urgency, string> = {
  today: "text-destructive",
  soon: "text-amber-600 dark:text-amber-400",
  normal: "text-muted-foreground",
  past: "text-muted-foreground",
};

const urgencyStyle: Record<Urgency, { bg: string; color: string }> = {
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

// ── 组件 ─────────────────────────────────────────────────────

export function ExamItem({
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
          className="flex min-w-[44px] min-h-[44px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-label={`取消「${exam.subject}」的完成状态`}
          title="撤销完成"
        >
          <CheckCircle2 className="size-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onComplete(exam.id)}
          className="flex min-w-[44px] min-h-[44px] shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground/60 transition-colors hover:border-primary hover:text-primary"
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
              {new Date(exam.completedAt).toLocaleDateString("zh-CN", {
                month: "numeric",
                day: "numeric",
              })}
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => isCompleted ? onUncomplete(exam.id) : setShowDeleteConfirm(true)}
          className="min-w-[44px] min-h-[44px] text-muted-foreground/50 hover:text-primary"
          aria-label={isCompleted ? "撤销完成" : `删除「${exam.subject}」`}
          title={isCompleted ? "撤销完成" : "删除"}
        >
          {isCompleted ? (
            <RotateCcw className="size-3.5" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除考试"
        description={`确定要删除「${exam.subject}」吗？删除后可在 5 秒内撤销。`}
        confirmText="删除"
        onConfirm={() => onDelete(exam.id)}
      />
    </div>
  );
}
