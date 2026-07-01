"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ScreenTimeState } from "@/lib/activity-tracker-v3";
import { formatDuration, formatSeconds } from "@/lib/format-duration";
import { cn } from "@/lib/utils";

interface ActivityStatsProps {
  state: ScreenTimeState;
  isPaused: boolean;
  isToday: boolean;
  reducedMotion: boolean;
}

export function ActivityStats({ state, isPaused, isToday, reducedMotion }: ActivityStatsProps) {
  const totalMinutes = state.totalMinutes;
  const activeMinutes = Math.max(0, totalMinutes);

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isToday ? "今日屏幕时间" : "当日屏幕时间"}
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {formatDuration(totalMinutes)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              前台 {formatDuration(activeMinutes)} · 空闲 {state.idleMinutes}m · 离开 {state.awayMinutes}m
            </div>
          </div>
          {isToday && (
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Badge variant="secondary" className={cn("h-4 px-1.5 text-xs", isPaused && "text-muted-foreground")}>
                  {isPaused ? "已暂停" : "追踪中"}
                </Badge>
                {state.currentApp && (
                  <span className="relative flex size-1.5">
                    {!reducedMotion && (
                      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", isPaused ? "bg-muted-foreground" : "bg-statusSuccess")} />
                    )}
                    <span className={cn("relative inline-flex size-1.5 rounded-full", isPaused ? "bg-muted-foreground" : "bg-statusSuccess")} />
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground truncate max-w-44">
                {state.currentApp || "未追踪"}
              </div>
              {state.currentApp && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatSeconds(state.durationSeconds)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
