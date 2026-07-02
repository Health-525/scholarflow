"use client";

import { CalendarDays, Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState, memo } from "react";

import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useIsClient } from "@/hooks/useIsClient";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";

export const ScheduleCard = memo(function ScheduleCard() {
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule;
  const adjustments = data?.adjustments ?? [];
  const isClient = useIsClient();
  const [expanded, setExpanded] = useState(false);

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

          {isClient &&
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
                    <Check className="size-5 text-statusSuccess/70" />
                    <p className="text-sm text-muted-foreground">
                      今天没有课，好好休息
                    </p>
                  </div>
                );
              }

              const nextIndex = nextCourse
                ? items.indexOf(nextCourse.item)
                : -1;
              const listItems = expanded
                ? items.filter((_, idx) => idx !== nextIndex)
                : [];

              return (
                <div className="space-y-2">
                  {nextCourse ? (
                    <div className="rounded-xl p-3 bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-white/10">
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
                  ) : (
                    <div className="py-4 flex items-center justify-center gap-2">
                      <Check className="size-5 text-statusSuccess/70" />
                      <p className="text-sm text-muted-foreground">
                        今日课程已结束
                      </p>
                    </div>
                  )}

                  {expanded &&
                    listItems.map((item, idx) => {
                      const colors = courseColor(item.title);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 border transition-colors hover:bg-muted/30"
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                          }}
                        >
                          <span
                            className="w-1 h-8 rounded-full shrink-0"
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

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      className="w-full flex items-center justify-center gap-1 pt-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expanded ? (
                        <>
                          收起 <ChevronUp className="size-3.5" />
                        </>
                      ) : (
                        <>
                          更多 <ChevronDown className="size-3.5" />
                        </>
                      )}
                    </button>
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
