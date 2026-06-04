"use client";

import { useState, useMemo } from "react";
import type { RawScheduleData, DayItem } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { courseColor } from "@/lib/schedule/course-color";
import { CountdownTimer } from "./CountdownTimer";
import { CourseDrawer } from "./CourseDrawer";

interface TodayViewProps {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}

export function TodayView({ schedule, adjustments }: TodayViewProps) {
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const tz = schedule.meta.tz || "Asia/Shanghai";

  const today = useMemo(() => getNowInTimeZone(tz), [tz]);
  const { items } = useMemo(
    () => getAdjustedItemsForDate(schedule, today, adjustments),
    [schedule, today, adjustments]
  );

  const nextCourse = useMemo(
    () => getNextCourse(schedule, today, tz),
    [schedule, today, tz]
  );

  return (
    <div className="space-y-4">
      {/* Hero: next course countdown */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {nextCourse ? (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              下节课
            </div>
            <div className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {nextCourse.item.title}
            </div>
            <div className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              {nextCourse.item.timeText}
              {nextCourse.item.location && ` · ${nextCourse.item.location}`}
            </div>
            <div
              className="text-2xl font-bold animate-breathe"
              style={{ color: "var(--accent)" }}
            >
              <CountdownTimer
                targetTime={nextCourse.startTime}
                label="距离上课"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="text-3xl mb-2" aria-hidden="true">✅</div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>
              今天的课程已全部结束
            </div>
          </div>
        )}
      </div>

      {/* Course list */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <p style={{ color: "var(--text-tertiary)" }}>今天没有课程</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const colors = courseColor(item.title);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="w-full text-left rounded-2xl p-4 transition-opacity active:opacity-80"
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                }}
                aria-label={`查看 ${item.title} 详情`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: colors.accent }}>
                      {item.title}
                    </div>
                    {item.timeText && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {item.timeText}
                        {item.location && ` · ${item.location}`}
                      </div>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }} aria-hidden="true">
                    ›
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Course drawer */}
      <CourseDrawer
        item={selectedItem}
        date={today}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default TodayView;
