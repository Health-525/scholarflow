"use client";

import { Monitor } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useScreenTime } from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

const CATEGORY_CLASS: Record<Category, { text: string; bg: string; bar: string; label: string }> = {
  coding: { text: "text-statusSuccess", bg: "bg-statusSuccess/10", bar: "bg-statusSuccess", label: "开发" },
  browsing: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo", label: "浏览" },
  study: { text: "text-primary", bg: "bg-primary/10", bar: "bg-primary", label: "学习" },
  entertainment: { text: "text-statusWarning", bg: "bg-statusWarning/10", bar: "bg-statusWarning", label: "娱乐" },
  communication: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo", label: "通讯" },
  system: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground", label: "系统" },
  other: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground", label: "其他" },
};

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const ScreenTimeCard = memo(function ScreenTimeCard() {
  const state = useScreenTime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasCurrent = mounted && state.isElectron && state.currentApp;
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
              {formatDuration(totalMinutes)}
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

          {mounted && !state.isElectron && (
            <p className="mt-3 text-xs text-muted-foreground">桌面版可用</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

export default ScreenTimeCard;
