"use client";

import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

import { Card, cardClasses } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/exam";

type Tone = "primary" | "success" | "warning" | "danger";

const TONE_STYLES: Record<Tone, { bg: string; color: string }> = {
  primary: { bg: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)" },
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

type Filter = "all" | "upcoming" | "completed";

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
  const content = (
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
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          cardClasses,
          "p-3 text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
          active
            ? "ring-2 ring-primary/40 bg-primary/5"
            : "hover:bg-muted/50"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <Card hover={false} className={cn("p-3", active && "ring-2 ring-primary/40 bg-primary/5")}>
      {content}
    </Card>
  );
}

function daysUntil(dateStr: string): number | null {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 86400000);
}

export function ExamStats({
  exams,
  filter,
  onFilter,
}: {
  exams: Exam[];
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible.filter((e) => e.status === "upcoming");
  const completed = visible.filter((e) => e.status === "completed");
  const next = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextDays = next ? daysUntil(next.date) : null;
  const overdue = upcoming.filter((e) => {
    const target = new Date(e.date + "T23:59:59");
    return target.getTime() < Date.now();
  }).length;

  const set = (f: Filter) => onFilter(filter === f ? "all" : f);

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={Clock}
        label="待考"
        value={upcoming.length}
        tone="primary"
        active={filter === "upcoming"}
        onClick={() => set("upcoming")}
      />
      <StatCard
        icon={overdue > 0 ? AlertCircle : TrendingUp}
        label={overdue > 0 ? "已逾期" : "最近考试"}
        value={overdue > 0 ? overdue : (nextDays === null ? "—" : `${nextDays} 天`)}
        tone={overdue > 0 ? "danger" : (nextDays !== null && nextDays <= 3 ? "warning" : "primary")}
      />
      <StatCard
        icon={CheckCircle2}
        label="已完成"
        value={completed.length}
        tone="success"
        active={filter === "completed"}
        onClick={() => set("completed")}
      />
    </div>
  );
}
