"use client";

import { Card } from "@/components/ui/card";
import { occupancyColor } from "@/lib/theme-colors";

import { StatCard } from "./StatCard";

export interface LibrarySummaryCardProps {
  summary: { avail: number; used: number; total: number };
  openLibsLength: number;
  dataUpdated?: string;
}

export function LibrarySummaryCard({
  summary,
  openLibsLength,
  dataUpdated,
}: LibrarySummaryCardProps) {
  // 展示的是空闲率，配色依据是占用率（used/total）——与阅览室卡片同一口径，
  // 保证「红＝挤」在两处含义一致。avail + used ≠ total（还有预约中的座位），
  // 所以不能用 100 - freePct 反推占用率。
  const freePct = summary.total > 0 ? (summary.avail / summary.total) * 100 : 0;
  const usedPct = summary.total > 0 ? (summary.used / summary.total) * 100 : 0;
  const color = occupancyColor(usedPct);

  return (
    <Card className="p-4 sm:p-5 mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <StatCard value={summary.avail} label="可用座位" color={color} />
          <div className="w-px h-10 bg-border" />
          <StatCard value={summary.used} label="已使用" />
          <div className="w-px h-10 bg-border" />
          <StatCard value={summary.total} label="总座位" />
        </div>
        <div className="hidden sm:block text-right">
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {freePct.toFixed(0)}%
          </div>
          <div className="text-[11px] text-muted-foreground">空闲率</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2.5 rounded-full overflow-hidden bg-secondary">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${freePct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
          <span>{openLibsLength} 个阅览室开放</span>
          <span>更新时间 {String(dataUpdated ?? "").slice(11, 19)}</span>
        </div>
      </div>
    </Card>
  );
}
