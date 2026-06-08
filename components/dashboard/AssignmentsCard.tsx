"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

const URGENCY_CONFIG = {
  overdue:  { label: "已逾期", color: "var(--status-error)",   dot: "#c0392b" },
  urgent:   { label: "紧急",   color: "var(--status-warning)",  dot: "#b85c00" },
  reminder: { label: "即将到", color: "#d97706",                dot: "#d97706" },
  normal:   { label: "",       color: "var(--text-tertiary)",   dot: "var(--border-strong)" },
};

export function AssignmentsCard() {
  const { assignments, isLoading, error, reload } = useAssignmentsQuery();
  const pending = assignments.filter((a) => !a.done).slice(0, 5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="sf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-warning)" }} aria-hidden="true" />
          <h2
            className="text-[13px] font-semibold tracking-wide"
            style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
          >
            待办作业
          </h2>
          {mounted && !isLoading && pending.length > 0 && (
            <span
              className="sf-chip sf-chip-warn text-[10px]"
              aria-label={`${pending.length} 项待办`}
            >
              {pending.length}
            </span>
          )}
        </div>
        <Link
          href="/assignments"
          className="text-[11px] tracking-wide transition-colors hover:opacity-70"
          style={{ color: "var(--accent)" }}
          aria-label="查看全部作业"
        >
          查看全部 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="skeleton h-6 rounded" />)}
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {mounted && !isLoading && !error && (
        pending.length === 0 ? (
          <div className="py-2 flex items-center gap-2">
            <span className="text-base" aria-hidden="true">✨</span>
            <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>暂无待办作业</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => {
              const urgency = classifyUrgency(a.deadline, new Date());
              const cfg = URGENCY_CONFIG[urgency];
              const deadlineDate = new Date(a.deadline);
              const deadlineLabel = deadlineDate.toLocaleDateString("zh-CN", {
                month: "numeric", day: "numeric",
              });

              return (
                <div key={a.id} className="flex items-center gap-2.5 py-0.5">
                  {/* Urgency dot */}
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cfg.dot }}
                    aria-hidden="true"
                  />
                  {/* Subject + title */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] truncate block" style={{ color: "var(--text-primary)" }}>
                      <span style={{ color: "var(--text-tertiary)" }}>{a.subject}</span>
                      <span style={{ color: "var(--text-muted)" }}> · </span>
                      {a.title}
                    </span>
                  </div>
                  {/* Deadline */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] tabular-nums" style={{ color: cfg.color }}>
                      {cfg.label ? `${cfg.label} · ` : ""}{deadlineLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default AssignmentsCard;
