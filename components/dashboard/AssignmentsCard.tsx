"use client";

import Link from "next/link";
import { useAssignments } from "@/hooks/useAssignments";
import { classifyUrgency } from "@/lib/assignment-utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

const URGENCY_COLORS = {
  overdue: "var(--status-error)",
  urgent: "var(--status-warning)",
  reminder: "#d97706",
  normal: "var(--text-tertiary)",
};

export function AssignmentsCard() {
  const { assignments, isLoading, error, reload } = useAssignments();

  const pending = assignments.filter((a) => !a.done).slice(0, 5);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          📝 待办作业
        </h2>
        <Link
          href="/assignments"
          className="text-xs"
          style={{ color: "var(--accent)" }}
          aria-label="查看全部作业"
        >
          查看全部
        </Link>
      </div>

      {isLoading && <LoadingSpinner size="sm" />}
      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <>
          {pending.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              暂无待办作业 🎉
            </p>
          ) : (
            <div className="space-y-1.5">
              {pending.map((a) => {
                const urgency = classifyUrgency(a.deadline, new Date());
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs truncate block" style={{ color: "var(--text-primary)" }}>
                        {a.subject} · {a.title}
                      </span>
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px]"
                      style={{ color: URGENCY_COLORS[urgency] }}
                    >
                      {new Date(a.deadline).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AssignmentsCard;
