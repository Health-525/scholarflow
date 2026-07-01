"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

import { CATEGORY_CLASS, CATEGORY_LABELS } from "@/components/activity/category-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Category } from "@/lib/activity-tracker-v3";
import { formatAppDuration } from "@/lib/format-duration";
import { cn } from "@/lib/utils";

interface AppRankingProps {
  appBreakdown: Array<{ app: string; seconds: number; category?: string }>;
  settings: ActivitySettings | null;
  settingsLoading: boolean;
  appsExpanded: boolean;
  onToggleExpanded: () => void;
  onCategorize: (app: string, category: Category) => void;
}

export function AppRanking({
  appBreakdown,
  settings,
  settingsLoading,
  appsExpanded,
  onToggleExpanded,
  onCategorize,
}: AppRankingProps) {
  const totalAppSeconds = useMemo(
    () => appBreakdown.reduce((sum, b) => sum + b.seconds, 0),
    [appBreakdown]
  );

  const displayedApps = appsExpanded ? appBreakdown : appBreakdown.slice(0, 8);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">应用排行</h3>
        <span className="text-xs text-muted-foreground">{appBreakdown.length} 个应用</span>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {displayedApps.map((b, idx) => {
              const pct = Math.min(100, Math.round((b.seconds / Math.max(totalAppSeconds, 1)) * 100));
              const category = b.category || "other";
              const cls = CATEGORY_CLASS[category as Category];
              const isUncategorized = category === "other";
              const rank = idx + 1;
              const rankBadgeCls =
                rank === 1
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : rank === 2
                    ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    : rank === 3
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "text-muted-foreground";
              return (
                <div key={b.app} className="space-y-1.5">
                  <div className="flex items-center gap-3 text-xs">
                    <span className={cn("w-5 text-center text-xs font-medium tabular-nums shrink-0 rounded px-0.5", rank <= 3 && rankBadgeCls)}>
                      {rank}
                    </span>
                    <span className="font-medium text-foreground/80 truncate shrink-0 max-w-32" title={b.app}>
                      {b.app}
                    </span>
                    {isUncategorized ? (
                      <div className="relative">
                        <select
                          value=""
                          aria-label={`为 ${b.app} 选择分类`}
                          onChange={(e) => {
                            const value = e.target.value as Category;
                            if (value) onCategorize(b.app, value);
                          }}
                          disabled={settingsLoading || !settings}
                          className="h-5 appearance-none rounded border border-input bg-background pl-1.5 pr-4 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">未分类</option>
                          {Object.entries(CATEGORY_LABELS)
                            .filter(([key]) => key !== "other")
                            .map(([key, label]) => (
                              <option key={key} value={key}>
                                归为 {label}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    ) : (
                      <Badge variant="secondary" className={cn("h-4 px-1.5 text-xs", cls.bg, cls.text)}>
                        {CATEGORY_LABELS[category as Category]}
                      </Badge>
                    )}
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums">{formatAppDuration(b.seconds)}</span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div className="bg-gradient-to-r from-primary to-primary/70 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {appBreakdown.length > 8 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 h-8 text-xs"
              onClick={onToggleExpanded}
            >
              {appsExpanded ? "收起" : `展开全部 (${appBreakdown.length})`}
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
