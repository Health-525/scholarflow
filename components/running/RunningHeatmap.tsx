"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Sunrise,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildHeatmapData } from "@/lib/running-utils";
import type { HeatmapDay, RunRecord } from "@/types";

interface RunningHeatmapProps {
  records: RunRecord[];
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function getCellColor(day: HeatmapDay): string {
  if (day.hasMorning && day.hasFree) return "rgb(var(--status-success-rgb))";
  if (day.hasMorning) return "rgba(var(--status-success-rgb), 0.5)";
  if (day.hasFree) return "rgba(var(--primary-rgb), 0.5)";
  return "hsl(var(--muted))";
}

function getCellLabel(day: HeatmapDay): string {
  const date = day.date;
  if (day.hasMorning && day.hasFree) return `${date} 晨跑+自由跑`;
  if (day.hasMorning) return `${date} 晨跑`;
  if (day.hasFree) return `${date} 自由跑`;
  return `${date} 无记录`;
}

export function RunningHeatmap({ records }: RunningHeatmapProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => buildHeatmapData(records, viewDate), [records, viewDate]);

  const firstDay = new Date(year, month, 1);
  const jsFirst = firstDay.getDay();
  const offsetCells = jsFirst === 0 ? 6 : jsFirst - 1;

  const todayStr = new Date().toISOString().slice(0, 10);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-base font-semibold text-foreground">
              {year} 年 {month + 1} 月跑步热力图
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              aria-label="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              aria-label="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-xs text-muted-foreground py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offsetCells }, (_, i) => (
            <div key={`offset-${i}`} />
          ))}

          {days.map((day) => {
            const dateNum = parseInt(day.date.split("-")[2], 10);
            const isToday = day.date === todayStr;

            return (
              <div
                key={day.date}
                className="aspect-square rounded-md flex items-center justify-center text-xs font-medium h-8"
                style={{
                  backgroundColor: getCellColor(day),
                  outline: isToday ? "2px solid hsl(var(--primary))" : "none",
                  outlineOffset: "1px",
                  color: day.hasMorning || day.hasFree
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--muted-foreground))",
                }}
                title={getCellLabel(day)}
                aria-label={getCellLabel(day)}
              >
                {dateNum}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: "rgba(var(--status-success-rgb), 0.5)" }}
            >
              <Sunrise className="w-3 h-3 text-primary-foreground" />
            </div>
            <span>晨跑</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: "rgba(var(--primary-rgb), 0.5)" }}
            >
              <Footprints className="w-3 h-3 text-primary-foreground" />
            </div>
            <span>自由跑</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-[var(--status-success)]">
              <Flame className="w-3 h-3 text-primary-foreground" />
            </div>
            <span>双打卡</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RunningHeatmap;
