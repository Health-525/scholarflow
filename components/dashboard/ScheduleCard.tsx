"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNextCourse } from "@/lib/schedule/next-course";
import { getNowInTimeZone } from "@/lib/schedule/timezone";

const COURSE_PALETTE = [
  { row: "bg-[#FAFAFF] dark:bg-indigo-400/10 border border-[#EDEDF5] dark:border-indigo-400/10", dot: "bg-[#4F46E5] dark:bg-indigo-400", accent: "text-[#4F46E5] dark:text-indigo-400 font-semibold" },
  { row: "bg-[#F5FAF7] dark:bg-green-400/10 border border-[#E5F0E8] dark:border-green-400/10", dot: "bg-[#059669] dark:bg-green-400", accent: "text-[#059669] dark:text-green-400 font-semibold" },
  { row: "bg-[#FDF8EF] dark:bg-amber-400/10 border border-[#F5ECD8] dark:border-amber-400/10", dot: "bg-[#D97706] dark:bg-amber-400", accent: "text-[#D97706] dark:text-amber-400 font-semibold" },
  { row: "bg-[#FAF8FF] dark:bg-purple-400/10 border border-[#EDE8F5] dark:border-purple-400/10", dot: "bg-[#7C3AED] dark:bg-purple-400", accent: "text-[#7C3AED] dark:text-purple-400 font-semibold" },
  { row: "bg-[#F5FAFB] dark:bg-cyan-300/10 border border-[#E5F0F3] dark:border-cyan-300/10", dot: "bg-[#0891B2] dark:bg-cyan-300", accent: "text-[#0891B2] dark:text-cyan-300 font-semibold" },
  { row: "bg-[#FDF5F5] dark:bg-red-400/10 border border-[#F5E5E5] dark:border-red-400/10", dot: "bg-[#DC2626] dark:bg-red-400", accent: "text-[#DC2626] dark:text-red-400 font-semibold" },
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
          <Link href="/schedule" className="text-[11px] tracking-wide text-[#7C89A3] hover:text-[#4F46E5] transition-colors">
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
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
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
                    <span className={`w-[3px] h-8 rounded-[999px] shrink-0 ${pal.dot}`} />
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
