"use client";

import Link from "next/link";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Course color palette — warm, ink-like tones
const COURSE_PALETTE = [
  { bg: "rgba(42,68,148,0.07)",  accent: "#2a4494", dot: "#2a4494" },
  { bg: "rgba(45,122,79,0.07)",  accent: "#2d7a4f", dot: "#2d7a4f" },
  { bg: "rgba(184,92,0,0.07)",   accent: "#b85c00", dot: "#b85c00" },
  { bg: "rgba(100,70,150,0.07)", accent: "#6446a0", dot: "#6446a0" },
  { bg: "rgba(6,140,160,0.07)",  accent: "#068ca0", dot: "#068ca0" },
  { bg: "rgba(192,57,43,0.07)",  accent: "#c0392b", dot: "#c0392b" },
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

  return (
    <div className="sf-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
          <h2
            className="text-[13px] font-semibold tracking-wide"
            style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
          >
            今日课表
          </h2>
        </div>
        <Link
          href="/schedule"
          className="text-[11px] tracking-wide transition-colors hover:opacity-70"
          style={{ color: "var(--accent)" }}
          aria-label="查看完整课表"
        >
          查看全部 →
        </Link>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="skeleton h-8 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={() => refetch()} />
      )}

      {/* Content */}
      {schedule && !isLoading && !error && (() => {
        const tz = schedule.meta.tz || "Asia/Shanghai";
        const today = getNowInTimeZone(tz);
        const { items } = getAdjustedItemsForDate(schedule, today, adjustments);

        if (items.length === 0) {
          return (
            <div className="py-2 flex items-center gap-2">
              <span className="text-base" aria-hidden="true">🎉</span>
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>今天没有课，好好休息</p>
            </div>
          );
        }

        return (
          <div className="space-y-1.5">
            {items.slice(0, 4).map((item, idx) => {
              const pal = getPalette(item.title);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                  style={{ background: pal.bg, border: `1px solid ${pal.accent}22` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pal.dot }} aria-hidden="true" />
                  <span
                    className="text-[12.5px] font-medium flex-1 truncate"
                    style={{ color: pal.accent }}
                  >
                    {item.title}
                  </span>
                  {item.timeText && (
                    <span className="text-[11px] shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {item.timeText}
                    </span>
                  )}
                </div>
              );
            })}
            {items.length > 4 && (
              <p className="text-[11px] text-center pt-0.5" style={{ color: "var(--text-muted)" }}>
                还有 {items.length - 4} 门课 …
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default ScheduleCard;
