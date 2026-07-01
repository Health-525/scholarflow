"use client";

import { Monitor } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { CATEGORY_CLASS } from "@/components/activity/category-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useIsClient } from "@/hooks/useIsClient";
import { useScreenTime } from "@/lib/activity-tracker-v3";
import { formatDurationShort, formatSeconds } from "@/lib/format-duration";
import { cn } from "@/lib/utils";

export const ScreenTimeCard = memo(function ScreenTimeCard() {
  const state = useScreenTime();
  const isClient = useIsClient();

  const hasCurrent = isClient && state.isElectron && state.currentApp;
  const totalMinutes = state.totalMinutes;

  return (
    <Link href="/activity">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">屏幕时间</h2>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-foreground leading-none">
              {formatDurationShort(totalMinutes)}
            </span>
            {state.idleMinutes > 0 && (
              <span className="text-xs text-muted-foreground">
                空闲 {state.idleMinutes}m
              </span>
            )}
          </div>

          {hasCurrent && (
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75 bg-statusSuccess" />
                <span className="relative inline-flex size-2 rounded-full bg-statusSuccess" />
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {state.currentApp}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatSeconds(state.durationSeconds)}
              </span>
            </div>
          )}

          {state.categoryBreakdown.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                {state.categoryBreakdown.map((c) => {
                  const cls = CATEGORY_CLASS[c.category];
                  const pct = Math.max(
                    1,
                    Math.round((c.minutes / Math.max(totalMinutes, 1)) * 100)
                  );
                  return (
                    <div
                      key={c.category}
                      className={cn("h-full min-w-[3px]", cls.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {state.categoryBreakdown.slice(0, 3).map((c) => {
                  const cls = CATEGORY_CLASS[c.category];
                  return (
                    <Badge
                      key={c.category}
                      variant="secondary"
                      className={cn("h-4 px-1 text-xs gap-1", cls.bg, cls.text)}
                    >
                      <span className={cn("size-1.5 rounded-full", cls.bar)} />
                      {cls.label} {c.minutes}m
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {isClient && !state.isElectron && (
            <p className="mt-3 text-xs text-muted-foreground">桌面版可用</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

export default ScreenTimeCard;
