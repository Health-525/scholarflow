"use client";

import { useEffect, useMemo, useState } from "react";

import { CATEGORY_COLORS, type Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

interface TimelineBarProps {
  segments: ActivityDaySummary["segments"];
  dateStr: string;
}

const SLOTS = 48; // 30 分钟一个格子
const SLOT_MS = (24 * 60 * 60 * 1000) / SLOTS;

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

export function TimelineBar({ segments, dateStr }: TimelineBarProps) {
  const { start, end } = useMemo(() => getDayBounds(dateStr), [dateStr]);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hovered, setHovered] = useState<{
    segment: ActivityDaySummary["segments"][number];
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const blocks = useMemo(() => {
    const result: Array<{
      segment: ActivityDaySummary["segments"][number];
      leftPct: number;
      widthPct: number;
      color: string;
    }> = [];

    for (const segment of segments) {
      if (segment.type !== "app") continue;
      const segStart = Math.max(segment.beginAt, start);
      const segEnd = Math.min(segment.endAt ?? now, end);
      if (segEnd <= segStart) continue;

      const leftPct = ((segStart - start) / (end - start)) * 100;
      const widthPct = ((segEnd - segStart) / (end - start)) * 100;
      const color = CATEGORY_COLORS[(segment.category as Category) || "other"];

      result.push({ segment, leftPct, widthPct, color });
    }

    return result;
  }, [segments, start, end, now]);

  return (
    <div className="relative">
      <div className="flex gap-0.5 overflow-x-auto pb-2 md:overflow-visible">
        {Array.from({ length: SLOTS }).map((_, i) => {
          const slotStart = start + i * SLOT_MS;
          const hour = Math.floor(i / 2);
          const isHourStart = i % 2 === 0;
          return (
            <div
              key={i}
              className="flex-shrink-0 relative"
              style={{ width: `${100 / SLOTS}%`, minWidth: "6px" }}
            >
              <div className="h-16 rounded-sm bg-muted/40" />
              {isHourStart && (
                <span className="absolute -bottom-5 left-0 text-xs text-muted-foreground hidden md:block">
                  {hour}
                </span>
              )}
              {/* 当前时间刻度线 */}
              {mounted && now >= slotStart && now < slotStart + SLOT_MS && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-destructive z-10"
                  style={{
                    left: `${((now - slotStart) / SLOT_MS) * 100}%`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Segment overlays */}
      <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none">
        {blocks.map((b, idx) => (
          <div
            key={idx}
            className="absolute top-0 h-full rounded-sm pointer-events-auto cursor-pointer"
            style={{
              left: `${b.leftPct}%`,
              width: `${Math.max(b.widthPct, 0.5)}%`,
              backgroundColor: b.color,
              opacity: 0.85,
            }}
            onMouseEnter={(e) =>
              setHovered({
                segment: b.segment,
                left: e.clientX,
                top: e.clientY,
              })
            }
            onMouseMove={(e) =>
              setHovered((prev) =>
                prev?.segment === b.segment
                  ? { segment: b.segment, left: e.clientX, top: e.clientY }
                  : prev
              )
            }
            onMouseLeave={() => setHovered(null)}
          />
        ))}
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
            {hovered.segment.app || "未知应用"}
          </div>
          {hovered.segment.title && (
            <div className="text-muted-foreground truncate mt-0.5">
              {hovered.segment.title}
            </div>
          )}
          <div className="mt-1 text-muted-foreground">
            {formatTime(hovered.segment.beginAt)} -{" "}
            {hovered.segment.endAt ? formatTime(hovered.segment.endAt) : "现在"}
            {" "}·{" "}
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
