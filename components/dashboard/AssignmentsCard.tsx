"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Card, CardContent } from "@/components/ui/card";

const URGENCY_CONFIG = {
  overdue:  { label: "已逾期", row: "bg-red-500/[0.06] dark:bg-red-500/10 border border-red-500/15 dark:border-red-500/20", dot: "bg-red-600 dark:bg-red-500", labelColor: "text-red-500 dark:text-red-400", dayColor: "text-red-500 dark:text-red-400" },
  urgent:   { label: "紧急", row: "bg-amber-500/[0.06] dark:bg-amber-500/10 border border-transparent", dot: "bg-amber-600 dark:bg-amber-500", labelColor: "text-amber-600 dark:text-amber-500", dayColor: "text-amber-600 dark:text-amber-500" },
  reminder: { label: "即将到", row: "bg-amber-400/[0.04] dark:bg-amber-500/[0.06] border border-transparent", dot: "bg-amber-500 dark:bg-amber-400", labelColor: "text-amber-500 dark:text-amber-400", dayColor: "text-amber-500 dark:text-amber-400" },
  normal:   { label: "", row: "border border-transparent", dot: "bg-border", labelColor: "text-muted-foreground", dayColor: "text-muted-foreground" },
};

export function AssignmentsCard() {
  const { assignments, isLoading, error, reload } = useAssignmentsQuery();
  const pending = assignments.filter((a) => !a.done).slice(0, 5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2m6 0a2 2 0 002 2" />
              </svg>
            </div>
            <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">待办作业</h2>
            {mounted && !isLoading && pending.length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                {pending.length}
              </span>
            )}
          </div>
          <Link href="/assignments" className="text-[11px] tracking-wide transition-colors hover:opacity-70 text-primary">
            查看全部 →
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
          </div>
        )}

        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

        {!isLoading && !error && (
          pending.length === 0 ? (
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
                const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);

                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm ${cfg.row}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] truncate block text-foreground">
                        <span className="text-muted-foreground">{a.subject}</span>
                        <span className="text-muted-foreground/40 mx-1">·</span>
                        {a.title}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      {cfg.label && (
                        <span className={`text-[10px] font-semibold ${cfg.labelColor}`}>
                          {cfg.label}
                        </span>
                      )}
                      <span className={`text-[11px] tabular-nums ${cfg.dayColor}`}>
                        {diffDays <= 0 ? "今天" : diffDays === 1 ? "明天" : `${diffDays}天`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

export default AssignmentsCard;
