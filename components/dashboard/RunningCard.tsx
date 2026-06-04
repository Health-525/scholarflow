"use client";

import Link from "next/link";
import { useRunning } from "@/hooks/useRunning";
import { calculateRunStats } from "@/lib/running-utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export function RunningCard() {
  const { records, isLoading, error, reload } = useRunning();
  const stats = calculateRunStats(records);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          🏃 阳光长跑
        </h2>
        <Link
          href="/running"
          className="text-xs"
          style={{ color: "var(--accent)" }}
          aria-label="查看跑步记录"
        >
          查看详情
        </Link>
      </div>

      {isLoading && <LoadingSpinner size="sm" />}
      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stats.total}
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              / 50 次
            </span>
          </div>
          <ProgressBar value={stats.progressPercent} height={6} />
          <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>晨跑 {stats.morning} 次</span>
            <span>自由跑 {stats.free} 次</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningCard;
