"use client";

import { useMemo, useState } from "react";
import type { RawScheduleData, DayItem } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { normalizeDate, getNowInTimeZone } from "@/lib/schedule/timezone";
import { courseColor } from "@/lib/schedule/course-color";
import { CourseDrawer } from "./CourseDrawer";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

interface WeekGridProps {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}

export function WeekGrid({ schedule, adjustments }: WeekGridProps) {
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0); // 0=current week, -1=last, +1=next
  const tz = schedule.meta.tz || "Asia/Shanghai";

  const { weekDays, weekLabel } = useMemo(() => {
    const today = getNowInTimeZone(tz);
    const normalized = normalizeDate(today);
    const jsDay = normalized.getDay();
    const monday = new Date(normalized);
    monday.setDate(normalized.getDate() - (jsDay === 0 ? 6 : jsDay - 1) + weekOffset * 7);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    // Week label: "3/10 - 3/16"
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    const label = `${fmt(days[0])} — ${fmt(days[6])}`;

    return { weekDays: days, weekLabel: label };
  }, [tz, weekOffset]);

  const today = useMemo(() => normalizeDate(getNowInTimeZone(tz)), [tz]);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="上一周"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="text-[10px] text-primary hover:opacity-70 transition-opacity"
            >
              回到本周
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="下一周"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day, idx) => {
          const { items } = getAdjustedItemsForDate(schedule, day, adjustments);
          const isToday = normalizeDate(day).getTime() === today.getTime();
          const isWeekend = idx >= 5;
          const dateNum = day.getDate();

          return (
            <div key={`${weekOffset}-${idx}`} className="flex flex-col gap-1.5">
              {/* Day header */}
              <div className="text-center pb-2 border-b border-border">
                <div className={`text-[10px] font-medium ${isWeekend ? "text-amber-500/60" : "text-muted-foreground"}`}>
                  {WEEKDAY_LABELS[idx]}
                </div>
                <div
                  className={`text-xs font-semibold mx-auto w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground"
                  }`}
                >
                  {dateNum}
                </div>
              </div>

              {/* Course blocks */}
              <div className="space-y-1 min-h-[80px]">
                {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40">—</span>
                  </div>
                ) : (
                  items.map((item, i) => {
                    const colors = courseColor(item.title);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setSelectedDate(day);
                        }}
                        className="w-full rounded-lg px-1.5 py-1.5 text-left transition-all active:scale-[0.96]"
                        style={{
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                        }}
                        aria-label={`${item.title} ${item.timeText || ""}`}
                      >
                        <div
                          className="text-[9px] font-semibold line-clamp-2 leading-tight"
                          style={{ color: colors.accent }}
                        >
                          {item.title}
                        </div>
                        {item.timeText && (
                          <div className="text-[8px] text-muted-foreground mt-0.5">
                            {item.timeText.split("-")[0]}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CourseDrawer
        item={selectedItem}
        date={selectedDate}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default WeekGrid;
