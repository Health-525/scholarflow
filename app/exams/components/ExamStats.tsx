"use client";

import { CheckCircle2, Clock, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
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

function daysUntil(dateStr: string): number | null {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 86400000);
}

export function ExamStats({ exams }: { exams: Exam[] }) {
  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible.filter((e) => e.status === "upcoming");
  const completed = visible.filter((e) => e.status === "completed");
  const next = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];
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
      <StatCard
        icon={CheckCircle2}
        label="已完成"
        value={completed.length}
        tone="success"
      />
    </div>
  );
}
