"use client";

import { Card } from "@/components/ui/card";
import { statusColor } from "@/lib/theme-colors";

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
  const c = statusColor;
  const freePct = summary.total > 0 ? (summary.avail / summary.total) * 100 : 0;

  return (
    <Card className="p-4 sm:p-5 mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <StatCard value={summary.avail} label="可用座位" color={c(freePct)} />
          <div className="w-px h-10 bg-border" />
          <StatCard value={summary.used} label="已使用" />
          <div className="w-px h-10 bg-border" />
          <StatCard value={summary.total} label="总座位" />
        </div>
        <div className="hidden sm:block text-right">
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: c(freePct) }}
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
            style={{ width: `${freePct}%`, backgroundColor: c(freePct) }}
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
