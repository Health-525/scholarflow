"use client";

import { CalendarDays, Check } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, memo } from "react";

import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";

const MAX_LIST_COURSES = 3;

export const ScheduleCard = memo(function ScheduleCard() {
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule;
  const adjustments = data?.adjustments ?? [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex flex-col flex-1 min-h-0 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">今日课表</h2>
          </div>
          <Link
            href="/schedule"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            查看全部
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
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
                    <Check className="size-5 text-statusSuccess" />
                    <p className="text-sm text-muted-foreground">
                      今天没有课，好好休息
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {nextCourse && (
                    <div className="rounded-xl p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="default" className="text-xs">
                            下节课
                          </Badge>
                          <span className="text-sm font-semibold truncate text-foreground">
                            {nextCourse.item.title}
                          </span>
                        </div>
                        <div className="text-sm font-bold tabular-nums text-primary">
                          <CountdownTimer
                            targetTime={nextCourse.startTime}
                            label=""
                          />
                        </div>
                      </div>
                      {nextCourse.item.location && (
                        <div className="text-xs text-muted-foreground mt-1 ml-[52px]">
                          {nextCourse.item.location}
                        </div>
                      )}
                    </div>
                  )}

                  {items.slice(0, MAX_LIST_COURSES).map((item, idx) => {
                    const colors = courseColor(item.title);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-colors hover:bg-muted/30"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <span
                          className="w-[3px] h-8 rounded-full shrink-0"
                          style={{ backgroundColor: colors.accent }}
                        />
                        <span
                          className="text-sm font-semibold flex-1 truncate"
                          style={{ color: colors.accent }}
                        >
                          {item.title}
                        </span>
                        {item.timeText && (
                          <span className="text-xs shrink-0 tabular-nums text-muted-foreground">
                            {item.timeText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {items.length > MAX_LIST_COURSES && (
                    <Link
                      href="/schedule"
                      className="block pt-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      还有 {items.length - MAX_LIST_COURSES} 门课 · 共 {items.length} 门
                    </Link>
                  )}
                </div>
              );
            })()}
        </div>
      </CardContent>
    </Card>
  );
});

export default ScheduleCard;
