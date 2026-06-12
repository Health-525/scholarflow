"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { getNextCourse } from "@/lib/schedule/next-course";
import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Card, CardContent } from "@/components/ui/card";

const COURSE_PALETTE = [
  { row: "bg-indigo-500/[0.07] dark:bg-indigo-400/10 border border-indigo-800/10 dark:border-indigo-400/10", dot: "bg-indigo-800 dark:bg-indigo-400", accent: "text-indigo-800 dark:text-indigo-400" },
  { row: "bg-emerald-600/[0.07] dark:bg-green-400/10 border border-emerald-700/10 dark:border-green-400/10", dot: "bg-emerald-700 dark:bg-green-400", accent: "text-emerald-700 dark:text-green-400" },
  { row: "bg-amber-700/[0.07] dark:bg-amber-400/10 border border-amber-700/10 dark:border-amber-400/10", dot: "bg-amber-700 dark:bg-amber-400", accent: "text-amber-700 dark:text-amber-400" },
  { row: "bg-violet-600/[0.07] dark:bg-purple-400/10 border border-violet-700/10 dark:border-purple-400/10", dot: "bg-violet-700 dark:bg-purple-400", accent: "text-violet-700 dark:text-purple-400" },
  { row: "bg-cyan-600/[0.07] dark:bg-cyan-300/10 border border-cyan-700/10 dark:border-cyan-300/10", dot: "bg-cyan-700 dark:bg-cyan-300", accent: "text-cyan-700 dark:text-cyan-300" },
  { row: "bg-red-600/[0.07] dark:bg-red-400/10 border border-red-700/10 dark:border-red-400/10", dot: "bg-red-700 dark:bg-red-400", accent: "text-red-700 dark:text-red-400" },
];

function getPalette(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return COURSE_PALETTE[h % COURSE_PALETTE.length];
}

export function ScheduleCard() {
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule;
  const adjustments = data?.adjustments ?? [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">今日课表</h2>
          </div>
          <Link href="/schedule" className="text-[11px] tracking-wide text-primary hover:opacity-70 transition-opacity">
            查看全部 →
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
          </div>
        )}

        {error && !isLoading && <ErrorFallback message={error.message} onRetry={() => refetch()} />}

        {mounted && schedule && !isLoading && !error && (() => {
          const tz = schedule.meta.tz || "Asia/Shanghai";
          const today = getNowInTimeZone(tz);
          const { items } = getAdjustedItemsForDate(schedule, today, adjustments);
          const nextCourse = getNextCourse(schedule, today, tz, adjustments);

          if (items.length === 0) {
            return (
              <div className="py-4 flex items-center justify-center gap-2">
                <span className="text-lg">🎉</span>
                <p className="text-[13px] text-muted-foreground">今天没有课，好好休息</p>
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {nextCourse && (
                <div className="rounded-xl p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 dark:bg-primary/15 text-primary">下节课</span>
                      <span className="text-[13px] font-semibold truncate text-foreground">{nextCourse.item.title}</span>
                    </div>
                    <div className="text-[13px] font-bold tabular-nums text-primary animate-breathe">
                      <CountdownTimer targetTime={nextCourse.startTime} label="" />
                    </div>
                  </div>
                  {nextCourse.item.location && (
                    <div className="text-[11px] text-muted-foreground mt-1 ml-[52px]">{nextCourse.item.location}</div>
                  )}
                </div>
              )}

              {items.slice(0, 4).map((item, idx) => {
                const pal = getPalette(item.title);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm ${pal.row}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pal.dot}`} />
                    <span className={`text-[12.5px] font-medium flex-1 truncate ${pal.accent}`}>{item.title}</span>
                    {item.timeText && (
                      <span className="text-[11px] shrink-0 tabular-nums text-muted-foreground">{item.timeText}</span>
                    )}
                  </div>
                );
              })}
              {items.length > 4 && (
                <Link href="/schedule" className="text-[11px] text-center pt-1 text-primary hover:opacity-70 transition-opacity block">
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
