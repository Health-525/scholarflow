"use client";

import type { RunStats } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface RunningStatsProps {
  stats: RunStats;
}

export function RunningStats({ stats }: RunningStatsProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="text-xs font-medium mb-4" style={{ color: "var(--text-tertiary)" }}>
        阳光长跑进度
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {stats.total}
          </span>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            / 50 次
          </span>
        </div>
        <ProgressBar
          value={stats.progressPercent}
          label={`${Math.round(stats.progressPercent)}%`}
          showPercent
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}
        >
          <div className="text-xl font-bold" style={{ color: "var(--status-success)" }}>
            {stats.morning}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            晨跑
          </div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            {stats.free}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            自由跑
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunningStats;
