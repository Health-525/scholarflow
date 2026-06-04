"use client";

import type { Assignment, AssignmentUrgency } from "@/types";
import { classifyUrgency } from "@/lib/assignment-utils";
import { DeadlineCountdown } from "./DeadlineCountdown";

interface AssignmentItemProps {
  assignment: Assignment;
  onMarkDone: (id: string) => void;
}

const URGENCY_BADGE: Record<AssignmentUrgency, { label: string; bg: string; color: string }> = {
  overdue: { label: "已逾期", bg: "rgba(255,59,48,0.12)", color: "var(--status-error)" },
  urgent: { label: "紧急", bg: "rgba(255,149,0,0.12)", color: "var(--status-warning)" },
  reminder: { label: "提醒", bg: "rgba(245,158,11,0.12)", color: "#d97706" },
  normal: { label: "正常", bg: "rgba(52,199,89,0.12)", color: "var(--status-success)" },
};

export function AssignmentItem({ assignment, onMarkDone }: AssignmentItemProps) {
  const urgency = classifyUrgency(assignment.deadline, new Date());
  const badge = URGENCY_BADGE[urgency];

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        opacity: assignment.done ? 0.6 : 1,
      }}
    >
      {/* Complete button */}
      {!assignment.done && (
        <button
          type="button"
          onClick={() => onMarkDone(assignment.id)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors hover:border-accent"
          style={{ borderColor: "var(--border)", backgroundColor: "transparent" }}
          aria-label={`标记 "${assignment.title}" 为完成`}
        />
      )}
      {assignment.done && (
        <div
          className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
          style={{ backgroundColor: "var(--status-success)", color: "#fff" }}
          aria-hidden="true"
        >
          ✓
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className="text-sm font-medium truncate"
              style={{
                color: "var(--text-primary)",
                textDecoration: assignment.done ? "line-through" : "none",
              }}
            >
              {assignment.title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {assignment.subject}
            </div>
          </div>

          {/* Urgency badge */}
          {!assignment.done && (
            <span
              className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            截止：{new Date(assignment.deadline).toLocaleString("zh-CN", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!assignment.done && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <DeadlineCountdown deadline={assignment.deadline} />
            </>
          )}
        </div>

        {/* Note */}
        {assignment.note && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
            {assignment.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default AssignmentItem;
