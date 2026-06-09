"use client";

import { useMemo, useState } from "react";
import type { RawScheduleData, DayItem, CourseView } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { normalizeDate, getNowInTimeZone } from "@/lib/schedule/timezone";
import { getWeekNumber } from "@/lib/schedule/schedule";
import { courseColor } from "@/lib/schedule/course-color";
import { CourseDrawer } from "./CourseDrawer";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PERIOD_DIVIDERS: Record<number, string> = { 5: "下午", 9: "晚上" };
const ROW_H = 44;
const HEADER_H = 40;

interface WeekGridProps {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}

interface CourseBlock {
  item: DayItem;
  firstPeriod: number;
  span: number;
}

export function WeekGrid({ schedule, adjustments }: WeekGridProps) {
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const tz = schedule.meta.tz || "Asia/Shanghai";

  const weekInfo = useMemo(() => {
    const now = getNowInTimeZone(tz);
    const normalized = normalizeDate(now);
    const jsDay = normalized.getDay();
    const monday = new Date(normalized);
    monday.setDate(normalized.getDate() - (jsDay === 0 ? 6 : jsDay - 1) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const fmt = (d: Date) => (d.getMonth() + 1) + "/" + d.getDate();
    return {
      days,
      label: fmt(days[0]) + " — " + fmt(days[6]),
      weekNum: getWeekNumber(days[0], schedule.meta.week1_monday),
    };
  }, [tz, weekOffset, schedule.meta.week1_monday]);

  const today = useMemo(() => normalizeDate(getNowInTimeZone(tz)), [tz]);

  const dayData = useMemo(() => {
    return weekInfo.days.map((day) => {
      const { items } = getAdjustedItemsForDate(schedule, day, adjustments);
      const courses: CourseBlock[] = [];
      const specials: DayItem[] = [];
      for (const item of items) {
        if (item.kind === "course") {
          const cv = item as CourseView;
          courses.push({ item, firstPeriod: cv.periods[0], span: cv.periods.length });
        } else {
          specials.push(item);
        }
      }
      return { courses, specials };
    });
  }, [schedule, weekInfo.days, adjustments]);

  const periodTimes = schedule.periodTimes || {};
  const totalGridH = ALL_PERIODS.length * ROW_H;

  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="上一周"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{weekInfo.label}</span>
          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
            {"第" + weekInfo.weekNum + "周"}
          </span>
          {weekOffset !== 0 && (
            <button type="button" onClick={() => setWeekOffset(0)} className="text-[11px] text-primary hover:opacity-70 transition-opacity ml-1">
              回到本周
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="下一周"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-5 px-5">
        <div className="min-w-[660px]">
          {/* Header row */}
          <div
            className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-border"
            style={{ height: HEADER_H }}
          >
            <div className="flex items-center justify-center text-[9px] text-muted-foreground">
              节次
            </div>
            {weekInfo.days.map((day, idx) => {
              const isToday = normalizeDate(day).getTime() === today.getTime();
              const isWeekend = idx >= 5;
              return (
                <div key={idx} className="flex flex-col items-center justify-center">
                  <div
                    className={
                      "text-[10px] font-medium " +
                      (isWeekend ? "text-amber-500/60" : "text-muted-foreground")
                    }
                  >
                    {WEEKDAY_LABELS[idx]}
                  </div>
                  <div
                    className={
                      "text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full " +
                      (isToday
                        ? "bg-primary text-primary-foreground text-[10px]"
                        : "text-foreground")
                    }
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="relative" style={{ height: totalGridH }}>
            {/* Period labels + grid lines */}
            {ALL_PERIODS.map((p) => {
              const top = (p - 1) * ROW_H;
              const dividerLabel = PERIOD_DIVIDERS[p] || null;
              const timeStr = periodTimes[String(p)] || "";
              return (
                <div key={p}>
                  {dividerLabel && (
                    <div
                      className="absolute left-0 right-0 flex items-center"
                      style={{ top: top - 6 }}
                    >
                      <span className="text-[9px] font-semibold text-muted-foreground bg-background px-1 z-10">
                        {dividerLabel}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <div
                    className="absolute left-0 w-[44px] flex flex-col items-center justify-center text-center border-r border-border/30"
                    style={{ top: top, height: ROW_H }}
                  >
                    <span className="text-[10px] font-semibold text-foreground">{p}</span>
                    {timeStr && (
                      <span className="text-[7px] text-muted-foreground leading-tight">
                        {timeStr.split("-")[0]}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute left-[44px] right-0 border-b border-border/30"
                    style={{ top: top + ROW_H - 1 }}
                  />
                </div>
              );
            })}

            {/* Day columns */}
            <div
              className="absolute left-[44px] right-0 grid grid-cols-7"
              style={{ top: 0, bottom: 0 }}
            >
              {weekInfo.days.map((day, dayIdx) => {
                const { courses } = dayData[dayIdx];
                const isToday = normalizeDate(day).getTime() === today.getTime();
                const todayBg = isToday ? "bg-primary/5" : "";
                return (
                  <div
                    key={dayIdx}
                    className={"relative border-r border-border/20 last:border-r-0 " + todayBg}
                  >
                    {/* Row backgrounds */}
                    {ALL_PERIODS.map((p) => (
                      <div
                        key={p}
                        className="absolute left-0 right-0 border-b border-border/10"
                        style={{ top: (p - 1) * ROW_H, height: ROW_H }}
                      />
                    ))}
                    {/* Course blocks */}
                    {courses.map((cb, i) => {
                      const colors = courseColor(cb.item.title);
                      const blockTop = (cb.firstPeriod - 1) * ROW_H + 2;
                      const blockHeight = cb.span * ROW_H - 4;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedItem(cb.item);
                            setSelectedDate(day);
                          }}
                          className="absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all active:scale-[0.97] hover:shadow-sm overflow-hidden"
                          style={{
                            top: blockTop,
                            height: blockHeight,
                            backgroundColor: colors.bg,
                            border: "1px solid " + colors.border,
                          }}
                          aria-label={cb.item.title + " " + (cb.item.timeText || "")}
                        >
                          <div
                            className="text-[11px] font-semibold leading-tight line-clamp-2"
                            style={{ color: colors.accent }}
                          >
                            {cb.item.title}
                          </div>
                          {cb.item.location && (
                            <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                              {cb.item.location}
                            </div>
                          )}
                          {cb.item.timeText && blockHeight > 50 && (
                            <div className="text-[8px] text-muted-foreground/70 mt-0.5">
                              {cb.item.timeText}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special items */}
          {dayData.some((d) => d.specials.length > 0) && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">特殊安排</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {weekInfo.days.map((day, dayIdx) =>
                dayData[dayIdx].specials.map((item, i) => {
                  const colors = courseColor(item.title);
                  return (
                    <button
                      key={"sp-" + dayIdx + "-" + i}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedDate(day);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left transition-all active:scale-[0.97] flex items-center gap-2"
                      style={{
                        backgroundColor: colors.bg,
                        border: "1px solid " + colors.border,
                      }}
                    >
                      <span className="text-[10px] text-muted-foreground tabular-nums w-6">
                        {WEEKDAY_LABELS[dayIdx]}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: colors.accent }}>
                        {item.title}
                      </span>
                      {item.timeText && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {item.timeText}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
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
