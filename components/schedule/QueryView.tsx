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
      <div>
        <label
          htmlFor="query-date"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          查询日期
        </label>
        <input
          id="query-date"
          type="date"
          value={inputDate}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          aria-label="选择查询日期"
        />
      </div>

      {result && (
        <div>
          <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
            {result.date.toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
            （第 {result.weekNum} 周）
          </div>

          {result.items.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--text-tertiary)" }}>该日无课程</p>
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
                    className="w-full text-left rounded-2xl p-4"
                    style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                    aria-label={`查看 ${item.title} 详情`}
                  >
                    <div className="font-semibold text-sm" style={{ color: colors.accent }}>
                      {item.title}
                    </div>
                    {item.timeText && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {item.timeText}
                        {item.location && ` · ${item.location}`}
                      </div>
                    )}
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
