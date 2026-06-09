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
    () => getNextCourse(schedule, today, tz, adjustments),
    [schedule, today, tz, adjustments]
  );

  const weekdayLabel = today.toLocaleDateString("zh-CN", { weekday: "long" });

  return (
    <div className="space-y-4">
      {/* Hero: next course countdown */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
        {nextCourse ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground">{weekdayLabel}</span>
              <span className="sf-chip sf-chip-accent">下节课</span>
            </div>
            <div className="text-lg font-bold font-display text-foreground mb-1">
              {nextCourse.item.title}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {nextCourse.item.timeText}
              {nextCourse.item.location && (
                <span className="ml-2">· {nextCourse.item.location}</span>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <span className="text-xl" aria-hidden="true">⏱</span>
              <div className="text-2xl font-bold text-primary tabular-nums animate-breathe">
                <CountdownTimer
                  targetTime={nextCourse.startTime}
                  label="距离上课"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-3xl mb-2" aria-hidden="true">✅</div>
            <div className="font-medium text-foreground">
              今天的课程已全部结束
            </div>
            <div className="text-xs text-muted-foreground mt-1">好好休息吧</div>
          </div>
        )}
      </div>

      {/* Course list */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl p-6 text-center bg-card border border-border">
            <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-3">
              <span className="text-xl">☕</span>
            </div>
            <p className="text-sm text-foreground font-medium">今天没有课程</p>
            <p className="text-xs text-muted-foreground mt-0.5">享受自由时光</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const colors = courseColor(item.title);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left rounded-xl p-4 transition-all active:scale-[0.98] hover:shadow-sm animate-fade-up stagger-${Math.min(idx + 1, 7)}`}
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                }}
                aria-label={`查看 ${item.title} 详情`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left color indicator + content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: colors.accent }}>
                        {item.title}
                      </div>
                      {item.timeText && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.timeText}
                          {item.location && (
                            <span className="ml-1.5 opacity-70">· {item.location}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Chevron */}
                  <svg className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
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
