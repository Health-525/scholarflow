"use client";

import { Calendar, Check, ChevronRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import { getNextCourse } from "@/lib/schedule/next-course";
import type { DayItem, RawScheduleData } from "@/lib/schedule/schedule";
import { getNowInTimeZone } from "@/lib/schedule/timezone";

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
    [schedule, today, adjustments],
  );

  const nextCourse = useMemo(
    () => getNextCourse(schedule, today, tz, adjustments),
    [schedule, today, tz, adjustments],
  );

  const weekdayLabel = today.toLocaleDateString("zh-CN", { weekday: "long" });
  const dateLabel = today.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Hero: next course countdown */}
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm relative overflow-hidden">
        {/* Decorative gradient */}
        {nextCourse && (
          <div
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-[0.04] pointer-events-none"
            style={{
              backgroundColor: courseColor(nextCourse.item.title).accent,
            }}
          />
        )}

        {nextCourse ? (
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {weekdayLabel} · {dateLabel}
              </span>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                下节课
              </Badge>
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
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
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
            <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--status-success)]/10 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-[var(--status-success)]" />
            </div>
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
          <EmptyState
            icon={Calendar}
            title="今天没有课程"
            description="享受自由时光"
          />
        ) : (
          items.map((item, idx) => {
            const colors = courseColor(item.title);
            return (
              <Button
                key={idx}
                variant="secondary"
                onClick={() => setSelectedItem(item)}
                className={`w-full h-auto text-left rounded-xl p-4 transition-all duration-200 active:scale-[0.98] hover:shadow-md animate-fade-up stagger-${Math.min(idx + 1, 7)} items-start justify-start whitespace-normal`}
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                }}
                aria-label={`查看 ${item.title} 详情`}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  {/* Left color indicator + content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-1.5 h-8 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <div className="min-w-0">
                      <div
                        className="font-semibold text-sm truncate"
                        style={{ color: colors.accent }}
                      >
                        {item.title}
                      </div>
                      {item.timeText && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {item.timeText}
                          {item.location && (
                            <span className="ml-1.5 opacity-70">
                              · {item.location}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </Button>
            );
          })
        )}
      </div>

      {/* Course drawer */}
      <CourseDrawer
        item={selectedItem}
        date={today}
        timeZone={tz}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default TodayView;
