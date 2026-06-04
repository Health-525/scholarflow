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
  const tz = schedule.meta.tz || "Asia/Shanghai";

  const weekDays = useMemo(() => {
    const today = getNowInTimeZone(tz);
    const normalized = normalizeDate(today);
    const jsDay = normalized.getDay();
    const monday = new Date(normalized);
    monday.setDate(normalized.getDate() - (jsDay === 0 ? 6 : jsDay - 1));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [tz]);

  const today = useMemo(() => normalizeDate(getNowInTimeZone(tz)), [tz]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, idx) => {
          const { items } = getAdjustedItemsForDate(schedule, day, adjustments);
          const isToday = normalizeDate(day).getTime() === today.getTime();
          const dateNum = day.getDate();

          return (
            <div key={idx} className="flex flex-col gap-1">
              {/* Day header */}
              <div className="text-center pb-1" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {WEEKDAY_LABELS[idx]}
                </div>
                <div
                  className={`text-xs font-medium mx-auto w-5 h-5 flex items-center justify-center rounded-full`}
                  style={{
                    backgroundColor: isToday ? "var(--accent)" : "transparent",
                    color: isToday ? "#fff" : "var(--text-primary)",
                  }}
                >
                  {dateNum}
                </div>
              </div>

              {/* Course blocks */}
              <div className="space-y-1 min-h-[60px]">
                {items.map((item, i) => {
                  const colors = courseColor(item.title);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedDate(day);
                      }}
                      className="w-full rounded-lg p-1 text-left"
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                      aria-label={`${item.title} ${item.timeText || ""}`}
                    >
                      <div
                        className="text-[9px] font-medium line-clamp-2 leading-tight"
                        style={{ color: colors.accent }}
                      >
                        {item.title}
                      </div>
                      {item.timeText && (
                        <div className="text-[8px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {item.timeText.split("-")[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
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
