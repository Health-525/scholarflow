"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { getNextCourse } from "@/lib/schedule/next-course";
import { CountdownTimer } from "@/components/schedule/CountdownTimer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Course color palette — warm, ink-like tones (light mode)
// Dark mode uses desaturated variants for eye comfort
const COURSE_PALETTE = [
  { bg: "rgba(42,68,148,0.07)",  accent: "#2a4494", dot: "#2a4494", darkBg: "rgba(129,140,248,0.10)", darkAccent: "#818CF8", darkDot: "#818CF8" },
  { bg: "rgba(45,122,79,0.07)",  accent: "#2d7a4f", dot: "#2d7a4f", darkBg: "rgba(34,197,94,0.10)", darkAccent: "#22C55E", darkDot: "#22C55E" },
  { bg: "rgba(184,92,0,0.07)",   accent: "#b85c00", dot: "#b85c00", darkBg: "rgba(245,158,11,0.10)", darkAccent: "#F59E0B", darkDot: "#F59E0B" },
  { bg: "rgba(100,70,150,0.07)", accent: "#6446a0", dot: "#6446a0", darkBg: "rgba(139,92,246,0.10)", darkAccent: "#A78BFA", darkDot: "#A78BFA" },
  { bg: "rgba(6,140,160,0.07)",  accent: "#068ca0", dot: "#068ca0", darkBg: "rgba(6,182,212,0.10)", darkAccent: "#22D3EE", darkDot: "#22D3EE" },
  { bg: "rgba(192,57,43,0.07)",  accent: "#c0392b", dot: "#c0392b", darkBg: "rgba(239,68,68,0.10)", darkAccent: "#EF4444", darkDot: "#EF4444" },
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      if (theme === "dark") setIsDark(true);
      else if (theme === "light") setIsDark(false);
      else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="rounded-2xl p-4 bg-card border border-border dark:border-transparent shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">
            今日课表
          </h2>
        </div>
        <Link
          href="/schedule"
          className="text-[11px] tracking-wide text-primary hover:opacity-70 transition-opacity"
          aria-label="查看完整课表"
        >
          查看全部 →
        </Link>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="skeleton h-10 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={() => refetch()} />
      )}

      {/* Content */}
      {mounted && schedule && !isLoading && !error && (() => {
        const tz = schedule.meta.tz || "Asia/Shanghai";
        const today = getNowInTimeZone(tz);
        const { items } = getAdjustedItemsForDate(schedule, today, adjustments);
        const nextCourse = getNextCourse(schedule, today, tz, adjustments);

        if (items.length === 0) {
          return (
            <div className="py-4 flex items-center justify-center gap-2">
              <span className="text-lg" aria-hidden="true">🎉</span>
              <p className="text-[13px] text-muted-foreground">今天没有课，好好休息</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {/* Next course countdown */}
            {nextCourse && (
              <div className="rounded-xl p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-transparent mb-2">
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
                  <div className="text-[11px] text-muted-foreground mt-1 ml-[52px]">
                    {nextCourse.item.location}
                  </div>
                )}
              </div>
            )}

            {/* Course list */}
            {items.slice(0, 4).map((item, idx) => {
              const pal = getPalette(item.title);
              const bg = isDark ? pal.darkBg : pal.bg;
              const accent = isDark ? pal.darkAccent : pal.accent;
              const dot = isDark ? pal.darkDot : pal.dot;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm"
                  style={{ background: bg, border: `1px solid ${accent}18` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} aria-hidden="true" />
                  <span
                    className="text-[12.5px] font-medium flex-1 truncate"
                    style={{ color: accent }}
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
              <Link href="/schedule" className="text-[11px] text-center pt-1 text-primary hover:opacity-70 transition-opacity block">
                还有 {items.length - 4} 门课 · 共 {items.length} 门 →
              </Link>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default ScheduleCard;
