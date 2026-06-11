"use client";

import Link from "next/link";
import { useRunningQuery } from "@/hooks/useQueries";
import { calculateRunStats } from "@/lib/running-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export function RunningCard() {
  const { records, isLoading, error, reload } = useRunningQuery();
  const stats = calculateRunStats(records);
  const pct = stats.progressPercent;

  return (
    <div className="sf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-600/10">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">阳光长跑</h2>
        </div>
        <Link href="/running" className="text-[11px] tracking-wide transition-colors hover:opacity-70 text-primary" aria-label="查看跑步详情">
          查看详情 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="skeleton h-8 w-20 rounded-xl" />
          <div className="skeleton h-2 rounded-full" />
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold tabular-nums font-display text-foreground tracking-tight">
              {stats.total}
            </span>
            <span className="text-[12px] text-muted-foreground">/ 50 次</span>
            {pct >= 100 && <span className="sf-chip sf-chip-ok ml-1">达标 ✓</span>}
          </div>

          {/* Progress bar with gradient */}
          <div className="sf-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`跑步进度 ${pct.toFixed(0)}%`}>
            <div className="sf-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>

          {/* Percentage label */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {pct.toFixed(0)}% 完成
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                🌅 晨跑 <strong className="text-foreground font-semibold">{stats.morning}</strong>
              </span>
              <span className="text-[11px] text-muted-foreground">
                自由 <strong className="text-foreground font-semibold">{stats.free}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningCard;