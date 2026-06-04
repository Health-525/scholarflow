"use client";

import Link from "next/link";
import { useRunning } from "@/hooks/useRunning";
import { calculateRunStats } from "@/lib/running-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export function RunningCard() {
  const { records, isLoading, error, reload } = useRunning();
  const stats = calculateRunStats(records);
  const pct = stats.progressPercent;

  return (
    <div className="sf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-success)" }} aria-hidden="true" />
          <h2
            className="text-[13px] font-semibold tracking-wide"
            style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
          >
            阳光长跑
          </h2>
        </div>
        <Link
          href="/running"
          className="text-[11px] tracking-wide transition-colors hover:opacity-70"
          style={{ color: "var(--accent)" }}
          aria-label="查看跑步详情"
        >
          查看详情 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="skeleton h-8 w-20 rounded" />
          <div className="skeleton h-2 rounded-full" />
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <div className="space-y-2.5">
          {/* Big number */}
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{
                fontFamily: "'Noto Serif SC', Georgia, serif",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {stats.total}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              / 50 次
            </span>
            {pct >= 100 && (
              <span className="sf-chip sf-chip-ok ml-1">达标 ✓</span>
            )}
          </div>

          {/* Progress track */}
          <div>
            <div className="sf-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`跑步进度 ${pct.toFixed(0)}%`}>
              <div className="sf-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Sub stats */}
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              🌅 晨跑 <strong style={{ color: "var(--text-secondary)" }}>{stats.morning}</strong> 次
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              自由跑 <strong style={{ color: "var(--text-secondary)" }}>{stats.free}</strong> 次 🆓
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningCard;
