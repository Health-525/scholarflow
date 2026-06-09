"use client";

import type { RunStats } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface RunningStatsProps {
  stats: RunStats;
}

export function RunningStats({ stats }: RunningStatsProps) {
  return (
    <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
      <div className="text-xs font-medium mb-4 text-muted-foreground">
        阳光长跑进度
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-3xl font-bold text-foreground">
            {stats.total}
          </span>
          <span className="text-sm text-muted-foreground">
            / 50 次
          </span>
        </div>
        <ProgressBar
          value={stats.progressPercent}
          label={`${Math.round(stats.progressPercent)}%`}
          showPercent
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center bg-green-500/8 border border-green-500/20">
          <div className="text-xl font-bold text-green-600">
            {stats.morning}
          </div>
          <div className="text-xs mt-0.5 text-muted-foreground">
            晨跑
          </div>
        </div>
        <div className="rounded-xl p-3 text-center bg-primary/8 border border-primary/20">
          <div className="text-xl font-bold text-primary">
            {stats.free}
          </div>
          <div className="text-xs mt-0.5 text-muted-foreground">
            自由跑
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunningStats;
