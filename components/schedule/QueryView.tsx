"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { RawScheduleData, DayItem } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { normalizeDate } from "@/lib/schedule/timezone";
import { courseColor } from "@/lib/schedule/course-color";
import { CourseDrawer } from "./CourseDrawer";

interface QueryViewProps {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
}

export function QueryView({ schedule, adjustments }: QueryViewProps) {
  const [inputDate, setInputDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [queryDate, setQueryDate] = useState<string>(inputDate);
  const [selectedItem, setSelectedItem] = useState<DayItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((value: string) => {
    setInputDate(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQueryDate(value);
    }, 400);
  }, []);

  const result = useMemo(() => {
    if (!queryDate) return null;
    const date = normalizeDate(new Date(queryDate));
    if (isNaN(date.getTime())) return null;
    const { items, weekNum } = getAdjustedItemsForDate(schedule, date, adjustments);
    return { items, weekNum, date };
  }, [queryDate, schedule, adjustments]);

  return (
    <div className="space-y-4">
      {/* Date input */}
      <div className="rounded-2xl p-4 bg-card border border-border">
        <label
          htmlFor="query-date"
          className="block text-xs font-medium text-muted-foreground mb-2"
        >
          选择日期
        </label>
        <input
          id="query-date"
          type="date"
          value={inputDate}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
          aria-label="选择查询日期"
        />
      </div>

      {/* Results */}
      {result && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-foreground">
              {result.date.toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="sf-chip sf-chip-accent">
              第 {result.weekNum} 周
            </span>
          </div>

          {result.items.length === 0 ? (
            <div className="rounded-2xl p-6 text-center bg-card border border-border">
              <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-3">
                <span className="text-xl">📭</span>
              </div>
              <p className="text-sm text-foreground font-medium">该日无课程</p>
            </div>
          ) : (
            <div className="space-y-2">
              {result.items.map((item, idx) => {
                const colors = courseColor(item.title);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="w-full text-left rounded-xl p-4 transition-all active:scale-[0.98] hover:shadow-sm"
                    style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                    aria-label={`查看 ${item.title} 详情`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: colors.accent }}
                      />
                      <div>
                        <div className="font-semibold text-sm" style={{ color: colors.accent }}>
                          {item.title}
                        </div>
                        {item.timeText && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.timeText}
                            {item.location && (
                              <span className="ml-1.5 opacity-70">· {item.location}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CourseDrawer
        item={selectedItem}
        date={result?.date ?? new Date()}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default QueryView;
