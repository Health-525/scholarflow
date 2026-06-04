"use client";

import type { HeatmapDay } from "@/types";
import { buildHeatmapData } from "@/lib/running-utils";
import type { RunRecord } from "@/types";

interface RunningHeatmapProps {
  records: RunRecord[];
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function getCellColor(day: HeatmapDay): string {
  if (day.hasMorning && day.hasFree) return "var(--status-success)";
  if (day.hasMorning) return "rgba(52,199,89,0.5)";
  if (day.hasFree) return "rgba(37,99,235,0.5)";
  return "var(--border)";
}

function getCellLabel(day: HeatmapDay): string {
  const date = day.date;
  if (day.hasMorning && day.hasFree) return `${date} 晨跑+自由跑`;
  if (day.hasMorning) return `${date} 晨跑`;
  if (day.hasFree) return `${date} 自由跑`;
  return `${date} 无记录`;
}

export function RunningHeatmap({ records }: RunningHeatmapProps) {
  const days = buildHeatmapData(records);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // First day of month weekday (1-7, Mon=1)
  const firstDay = new Date(year, month, 1);
  const jsFirst = firstDay.getDay();
  const offsetCells = jsFirst === 0 ? 6 : jsFirst - 1; // empty cells before first day

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>
        {now.getFullYear()} 年 {now.getMonth() + 1} 月跑步热力图
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Offset cells */}
        {Array.from({ length: offsetCells }, (_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateNum = parseInt(day.date.split("-")[2], 10);
          const isToday = day.date === now.toISOString().slice(0, 10);

          return (
            <div
              key={day.date}
              className="aspect-square rounded-md flex items-center justify-center text-[10px] font-medium"
              style={{
                backgroundColor: getCellColor(day),
                outline: isToday ? "2px solid var(--accent)" : "none",
                outlineOffset: "1px",
                color: day.hasMorning || day.hasFree ? "#fff" : "var(--text-tertiary)",
              }}
              title={getCellLabel(day)}
              aria-label={getCellLabel(day)}
            >
              {dateNum}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(52,199,89,0.5)" }} />
          <span>晨跑</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(37,99,235,0.5)" }} />
          <span>自由跑</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--status-success)" }} />
          <span>双打卡</span>
        </div>
      </div>
    </div>
  );
}

export default RunningHeatmap;
