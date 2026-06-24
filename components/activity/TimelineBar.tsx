"use client";

import { useEffect, useMemo, useState } from "react";

import { CATEGORY_COLORS, type Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

interface TimelineBarProps {
  segments: ActivityDaySummary["segments"];
  dateStr: string;
}

const LANE_HEIGHT = 22;
const LANE_GAP = 4;
const TYPE_COLORS: Record<ActivityDaySummary["segments"][number]["type"], string> = {
  app: "#94a3b8",
  idle: "#f59e0b",
  away: "#64748b",
};

function getDayBounds(dateStr: string): { start: number; end: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 1) return `${s}秒`;
  if (m < 60) return `${m}分${s ? `${s}秒` : ""}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}小时${rm ? `${rm}分` : ""}`;
}

type LaneSegment = {
  segment: ActivityDaySummary["segments"][number];
  leftPct: number;
  widthPct: number;
  color: string;
  lane: number;
};

export function TimelineBar({ segments, dateStr }: TimelineBarProps) {
  const { start, end } = useMemo(() => getDayBounds(dateStr), [dateStr]);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hovered, setHovered] = useState<LaneSegment & { left: number; top: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { lanes, items } = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.beginAt - b.beginAt);
    const laneEnds: number[] = [];
    const result: LaneSegment[] = [];

    for (const segment of sorted) {
      const segStart = Math.max(segment.beginAt, start);
      const segEnd = Math.min(segment.endAt ?? now, end);
      if (segEnd <= segStart) continue;

      const leftPct = ((segStart - start) / (end - start)) * 100;
      const widthPct = ((segEnd - segStart) / (end - start)) * 100;

      let color: string;
      if (segment.type === "app") {
        color = CATEGORY_COLORS[(segment.category as Category) || "other"];
      } else {
        color = TYPE_COLORS[segment.type];
      }

      // 找到第一个不重叠的 lane（允许 1px 制造视觉分隔）
      let lane = laneEnds.findIndex((lastEnd) => segStart >= lastEnd);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(segEnd);
      } else {
        laneEnds[lane] = segEnd;
      }

      result.push({ segment, leftPct, widthPct, color, lane });
    }

    return { lanes: laneEnds.length, items: result };
  }, [segments, start, end, now]);

  const containerHeight = Math.max(1, lanes) * LANE_HEIGHT + Math.max(0, lanes - 1) * LANE_GAP + 8;

  return (
    <div className="relative">
      {/* 小时刻度 */}
      <div className="relative h-5 mb-1">
        {Array.from({ length: 24 }).map((_, h) => (
          <span
            key={h}
            className="absolute text-[10px] text-muted-foreground tabular-nums -translate-x-1/2"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {h}
          </span>
        ))}
      </div>

      <div
        className="relative rounded-md bg-muted/40 overflow-hidden"
        style={{ height: containerHeight }}
      >
        {/* 垂直网格线 */}
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={`grid-${h}`}
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* 当前时间线 */}
        {mounted && now >= start && now <= end && (
          <div
            className="absolute top-0 bottom-0 w-px bg-destructive z-20"
            style={{ left: `${((now - start) / (end - start)) * 100}%` }}
          />
        )}

        {/* 片段块 */}
        {items.map((item, idx) => {
          const top = item.lane * (LANE_HEIGHT + LANE_GAP) + 4;
          return (
            <div
              key={idx}
              className={cn(
                "absolute rounded-sm cursor-pointer transition-opacity hover:opacity-100",
                item.segment.type === "app" ? "opacity-90" : "opacity-50"
              )}
              style={{
                left: `${item.leftPct}%`,
                width: `${Math.max(item.widthPct, 0.25)}%`,
                top,
                height: LANE_HEIGHT,
                backgroundColor: item.color,
              }}
              onMouseEnter={(e) =>
                setHovered({
                  ...item,
                  left: e.clientX,
                  top: e.clientY,
                })
              }
              onMouseMove={(e) =>
                setHovered((prev) =>
                  prev?.segment === item.segment
                    ? { ...item, left: e.clientX, top: e.clientY }
                    : prev
                )
              }
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className={cn(
            "fixed z-50 px-3 py-2 rounded-lg border bg-popover text-popover-foreground shadow-lg text-xs max-w-xs",
            "pointer-events-none"
          )}
          style={{
            left: hovered.left + 12,
            top: hovered.top - 12,
          }}
        >
          <div className="font-medium truncate">
            {hovered.segment.app ||
              (hovered.segment.type === "idle" ? "系统空闲" : hovered.segment.type === "away" ? "离开" : "未知")}
          </div>
          {hovered.segment.title && hovered.segment.type === "app" && (
            <div className="text-muted-foreground truncate mt-0.5">
              {hovered.segment.title}
            </div>
          )}
          <div className="mt-1 text-muted-foreground">
            {formatTime(hovered.segment.beginAt)} -{" "}
            {hovered.segment.endAt ? formatTime(hovered.segment.endAt) : "现在"}
            {" · "}
            {formatDuration(
              Math.round(
                ((hovered.segment.endAt ?? now) - hovered.segment.beginAt) / 1000
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
