"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateStripProps {
  selectedDate: string;
  datesWithReport: Set<string>;
  onSelect: (date: string) => void;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

export function DateStrip({ selectedDate, datesWithReport, onSelect }: DateStripProps) {
  const todayStr = formatDateStr(new Date());

  // 以选中日期为中心，展示前后各 3 天
  const days = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 3));

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onSelect(addDays(selectedDate, -7))}
        aria-label="前一周"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex-1 flex items-center justify-between gap-1 overflow-x-auto py-1">
        {days.map((date) => {
          const d = parseDate(date);
          const isSelected = date === selectedDate;
          const isToday = date === todayStr;
          const hasReport = datesWithReport.has(date);
          const weekday = WEEKDAY_LABELS[d.getDay()];

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[3.25rem] h-14 rounded-xl text-xs transition-colors relative",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className={cn("text-[10px] font-medium mb-0.5", isSelected ? "text-primary-foreground/80" : "")}>
                {isToday ? "今" : weekday}
              </span>
              <span className={cn("text-sm font-semibold tabular-nums", isSelected && "text-primary-foreground")}>
                {d.getDate()}
              </span>
              {hasReport && (
                <span
                  className={cn(
                    "absolute bottom-1.5 h-1 w-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onSelect(addDays(selectedDate, 7))}
        aria-label="后一周"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
