"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useRunningQuery } from "@/hooks/useQueries";
import { calculateRunStats, RUNNING_GOAL } from "@/lib/running-utils";

export const RunningCard = memo(function RunningCard() {
  const { records, isLoading, error, reload } = useRunningQuery();
  const stats = calculateRunStats(records);
  const pct = stats.progressPercent;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-statusSuccess/10">
              <Zap className="w-3.5 h-3.5 text-statusSuccess" />
            </div>
            <h2 className="text-sm font-semibold font-display text-foreground">阳光长跑</h2>
          </div>
          <Link href="/running" className="text-xs transition-colors hover:opacity-70 text-primary" aria-label="查看跑步详情">
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
              <span className="text-3xl font-bold tabular-nums font-display text-foreground tracking-tight">
                {stats.total}
              </span>
              <span className="text-xs text-muted-foreground">/ {RUNNING_GOAL} 次</span>
              {pct >= 100 && (
                <Badge variant="secondary" className="text-xs h-4 px-1 gap-1 bg-statusSuccess/10 text-statusSuccess hover:bg-statusSuccess/10 ml-1">
                  达标 ✓
                </Badge>
              )}
            </div>

            <div className="h-2.5 rounded-full overflow-hidden bg-muted border border-border/30" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`跑步进度 ${pct.toFixed(0)}%`}>
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--chart-success)] to-statusSuccess transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {pct.toFixed(0)}% 完成
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  🌅 晨跑 <strong className="text-foreground font-semibold">{stats.morning}</strong>
                </span>
                <span className="text-xs text-muted-foreground">
                  自由 <strong className="text-foreground font-semibold">{stats.free}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default RunningCard;
