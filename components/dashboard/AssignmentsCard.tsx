"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";

const URGENCY_CONFIG = {
  overdue: {
    label: "已逾期",
    row: "bg-destructive/6 dark:bg-destructive/10 border border-destructive/15 dark:border-destructive/20",
    dot: "bg-destructive",
    labelColor: "text-destructive",
    dayColor: "text-destructive",
  },
  urgent: {
    label: "紧急",
    row: "bg-[var(--status-warning)]/6 dark:bg-[var(--status-warning)]/10 border border-transparent",
    dot: "bg-[var(--status-warning)]",
    labelColor: "text-[var(--status-warning)]",
    dayColor: "text-[var(--status-warning)]",
  },
  reminder: {
    label: "即将到",
    row: "bg-[var(--status-warning)]/4 dark:bg-[var(--status-warning)]/6 border border-transparent",
    dot: "bg-[var(--status-warning)]",
    labelColor: "text-[var(--status-warning)]",
    dayColor: "text-[var(--status-warning)]",
  },
  normal: {
    label: "",
    row: "border border-transparent",
    dot: "bg-secondary",
    labelColor: "text-muted-foreground",
    dayColor: "text-muted-foreground",
  },
};

export function AssignmentsCard() {
  const { assignments, isLoading, error, reload } = useAssignmentsQuery();
  const pending = assignments.filter((a) => !a.done).slice(0, 5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--status-warning)]/10">
              <ClipboardList className="w-3.5 h-3.5 text-[var(--status-warning)]" />
            </div>
            <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">
              待办作业
            </h2>
            {mounted && !isLoading && pending.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-[var(--status-warning)]/10 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/10">
                {pending.length}
              </Badge>
            )}
          </div>
          <Link
            href="/assignments"
            className="text-[11px] tracking-wide transition-colors hover:opacity-70 text-primary"
          >
            查看全部 →
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-8 rounded-xl" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <ErrorFallback message={error.message} onRetry={reload} />
        )}

        {!isLoading &&
          !error &&
          (pending.length === 0 ? (
            <div className="py-4 flex items-center justify-center gap-2">
              <span className="text-lg">✨</span>
              <p className="text-[13px] text-muted-foreground">暂无待办作业</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pending.map((a) => {
                const urgency = classifyUrgency(a.deadline, new Date());
                const cfg = URGENCY_CONFIG[urgency];
                const deadlineDate = new Date(a.deadline);
                const diffDays = Math.ceil(
                  (deadlineDate.getTime() - Date.now()) / 86400000,
                );

                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm ${cfg.row}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] truncate block text-foreground">
                        <span className="text-muted-foreground">
                          {a.subject}
                        </span>
                        <span className="text-muted-foreground/40 mx-1">·</span>
                        {a.title}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      {cfg.label && (
                        <span
                          className={`text-[10px] font-semibold ${cfg.labelColor}`}
                        >
                          {cfg.label}
                        </span>
                      )}
                      <span
                        className={`text-[11px] tabular-nums ${cfg.dayColor}`}
                      >
                        {diffDays <= 0
                          ? "今天"
                          : diffDays === 1
                            ? "明天"
                            : `${diffDays}天`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

export default AssignmentsCard;
