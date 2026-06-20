"use client";

import { Monitor } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cardClasses } from "@/components/ui/card";
import { useActivityTrackerV3 } from "@/lib/activity-tracker-v3";
import { cn } from "@/lib/utils";

export function ScreenTimeCard() {
  const state = useActivityTrackerV3();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const activeMins = Math.round(state.totalActiveMs / 60000);

  return (
    <Link href="/activity" className={cn(cardClasses, "h-full")}>
      <div className="flex flex-col h-full p-4 justify-center text-center relative">
        <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-[0.04] dark:opacity-[0.07] pointer-events-none group-hover:opacity-[0.08] dark:group-hover:opacity-[0.13] transition-opacity duration-300 bg-primary" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-primary" />
            <span className="text-[12px] font-semibold text-muted-foreground">活跃时长</span>
          </div>
          <div className="text-[28px] font-bold tabular-nums transition-transform duration-200 group-hover:scale-105 text-foreground leading-none">
            {activeMins}<span className="text-[13px] font-medium text-muted-foreground"> min</span>
          </div>

          {state.categoryBreakdown.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2.5">
              {state.categoryBreakdown.slice(0, 3).map(c => (
                <Badge key={c.category} variant="outline" className="text-[10px] h-4 px-1 gap-1 border-transparent" style={{ backgroundColor: c.color, color: "white" }}>
                  {c.minutes}分
                </Badge>
              ))}
            </div>
          )}

          {mounted && !state.isElectron && state.categoryBreakdown.length === 0 && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              需要 Electron 桌面版才能追踪应用
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
