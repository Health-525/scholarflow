"use client";

import { CalendarDays } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import type { Adjustment, AdjustmentDraft } from "@/lib/schedule/adjustments";
import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { courseColor } from "@/lib/schedule/course-color";
import type { DayItem, RawScheduleData } from "@/lib/schedule/schedule";
import {
  formatDateInTimeZone,
  getNowInTimeZone,
  normalizeDate,
} from "@/lib/schedule/timezone";

import { CourseDrawer } from "./CourseDrawer";

interface QueryViewProps {
  schedule: RawScheduleData;
  adjustments: Adjustment[];
  onAddAdjustment?: (draft: AdjustmentDraft) => Promise<unknown>;
  onRemoveAdjustment?: (id: string) => Promise<unknown>;
}

export function QueryView({
  schedule,
  adjustments,
  onAddAdjustment,
  onRemoveAdjustment,
}: QueryViewProps) {
  const tz = schedule.meta.tz || "Asia/Shanghai";
  const [inputDate, setInputDate] = useState(() => {
    return formatDateInTimeZone(getNowInTimeZone(tz), tz);
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
    const { items, weekNum } = getAdjustedItemsForDate(
      schedule,
      date,
      adjustments,
    );
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
        <Input
          id="query-date"
          type="date"
          value={inputDate}
          onChange={(e) => handleChange(e.target.value)}
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
            <Badge variant="secondary">第 {result.weekNum} 周</Badge>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="该日无课程"
              description="选择其他日期再看看"
            />
          ) : (
            <div className="space-y-2">
              {result.items.map((item, idx) => {
                const colors = courseColor(item.title);
                return (
                  <Button
                    key={idx}
                    variant="secondary"
                    onClick={() => setSelectedItem(item)}
                    className="w-full h-auto text-left rounded-xl p-4 transition-all active:scale-[0.98] hover:shadow-sm items-start justify-start whitespace-normal"
                    style={{
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                    }}
                    aria-label={`查看 ${item.title} 详情`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: colors.accent }}
                      />
                      <div>
                        <div
                          className="font-semibold text-sm"
                          style={{ color: colors.accent }}
                        >
                          {item.title}
                        </div>
                        {item.timeText && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {item.timeText}
                            {item.location && (
                              <span className="ml-1.5 opacity-70">
                                · {item.location}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CourseDrawer
        item={selectedItem}
        date={result?.date ?? new Date()}
        timeZone={tz}
        schedule={schedule}
        adjustments={adjustments}
        onClose={() => setSelectedItem(null)}
        onAddAdjustment={onAddAdjustment}
        onRemoveAdjustment={onRemoveAdjustment}
      />
    </div>
  );
}

export default QueryView;
