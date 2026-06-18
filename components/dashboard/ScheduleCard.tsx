"use client";

import { CalendarDays, Check } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";

export function ScheduleCard() {
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule;
  const adjustments = data?.adjustments ?? [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">
              今日课表
            </h2>
          </div>
          <Link
            href="/schedule"
            className="text-[11px] tracking-wide text-muted-foreground hover:text-primary transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-10 rounded-xl" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <ErrorFallback message={error.message} onRetry={() => refetch()} />
        )}

        {mounted &&
          schedule &&
          !isLoading &&
          !error &&
          (() => {
            const tz = schedule.meta.tz || "Asia/Shanghai";
            const today = getNowInTimeZone(tz);
            const { items } = getAdjustedItemsForDate(
              schedule,
              today,
              adjustments,
            );
            const nextCourse = getNextCourse(schedule, today, tz, adjustments);

            if (items.length === 0) {
              return (
                <div className="py-4 flex items-center justify-center gap-2">
                  <Check className="w-5 h-5 text-[var(--status-success)]" />
                  <p className="text-[13px] text-muted-foreground">
                    今天没有课，好好休息
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {nextCourse && (
                  <div className="rounded-xl p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-white/5 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="default" className="text-[10px]">
                          下节课
                        </Badge>
                        <span className="text-[13px] font-semibold truncate text-foreground">
                          {nextCourse.item.title}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold tabular-nums text-primary animate-breathe">
                        <CountdownTimer
                          targetTime={nextCourse.startTime}
                          label=""
                        />
                      </div>
                    </div>
                    {nextCourse.item.location && (
                      <div className="text-[11px] text-muted-foreground mt-1 ml-[52px]">
                        {nextCourse.item.location}
                      </div>
                    )}
                  </div>
                )}

                {items.slice(0, 4).map((item, idx) => {
                  const colors = courseColor(item.title);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm border"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      }}
                    >
                      <span
                        className="w-[3px] h-8 rounded-[999px] shrink-0"
                        style={{ backgroundColor: colors.accent }}
                      />
                      <span
                        className="text-[12.5px] font-semibold flex-1 truncate"
                        style={{ color: colors.accent }}
                      >
                        {item.title}
                      </span>
                      {item.timeText && (
                        <span className="text-[11px] shrink-0 tabular-nums text-muted-foreground">
                          {item.timeText}
                        </span>
                      )}
                    </div>
                  );
                })}
                {items.length > 4 && (
                  <Link
                    href="/schedule"
                    className="text-[11px] text-center pt-1 text-primary hover:opacity-70 transition-opacity block"
                  >
                    还有 {items.length - 4} 门课 · 共 {items.length} 门 →
                  </Link>
                )}
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
}

export default ScheduleCard;
