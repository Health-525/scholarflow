"use client";

import Link from "next/link";
import { useSchedule } from "@/hooks/useSchedule";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { courseColor } from "@/lib/schedule/course-color";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export function ScheduleCard() {
  const { schedule, adjustments, isLoading, error, reload } = useSchedule();

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
          📅 今日课表
        </h2>
        <Link
          href="/schedule"
          className="text-xs"
          style={{ color: "var(--accent)" }}
          aria-label="查看完整课表"
        >
          查看全部
        </Link>
      </div>

      {isLoading && <LoadingSpinner size="sm" />}
      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {schedule && !isLoading && !error && (() => {
        const tz = schedule.meta.tz || "Asia/Shanghai";
        const today = getNowInTimeZone(tz);
        const { items } = getAdjustedItemsForDate(schedule, today, adjustments);

        if (items.length === 0) {
          return (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              今天没有课
            </p>
          );
        }

        return (
          <div className="space-y-1.5">
            {items.slice(0, 4).map((item, idx) => {
              const colors = courseColor(item.title);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <span className="font-medium truncate" style={{ color: colors.accent }}>
                    {item.title}
                  </span>
                  {item.timeText && (
                    <span className="flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                      {item.timeText}
                    </span>
                  )}
                </div>
              );
            })}
            {items.length > 4 && (
              <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
                还有 {items.length - 4} 门课...
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default ScheduleCard;
