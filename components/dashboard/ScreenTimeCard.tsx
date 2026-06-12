"use client";

import { useActivityTrackerV3 } from "@/lib/activity-tracker-v3";
import Link from "next/link";
import { cardClasses } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ScreenTimeCard() {
  const state = useActivityTrackerV3();
  const activeMins = Math.round(state.totalActiveMs / 60000);
  const idleMins = Math.round((state.idleMs + state.awayMs) / 60000);
  const total = activeMins + idleMins || 1;
  const rate = Math.round((activeMins / total) * 100);

  return (
    <Link href="/activity" className={cn(cardClasses, "h-full")}>
      <div className="flex flex-col h-full p-4 justify-center text-center relative">
        <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-[0.04] dark:opacity-[0.07] pointer-events-none group-hover:opacity-[0.08] dark:group-hover:opacity-[0.13] transition-opacity duration-300 bg-primary" />
        <div className="relative">
          <div className="text-[28px] font-bold tabular-nums transition-transform duration-200 group-hover:scale-105 text-foreground leading-none">
            {activeMins}<span className="text-[13px] font-medium text-muted-foreground"> min</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">活跃时长</div>

          <div className="flex items-center gap-2 justify-center mt-3">
            <div className="w-12 h-1 rounded-full overflow-hidden flex bg-secondary">
              <div className="h-full transition-all bg-primary rounded-full" style={{ width: `${rate}%` }} />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{rate}%</span>
          </div>

          {state.categoryBreakdown.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-2.5">
              {state.categoryBreakdown.slice(0, 3).map(c => (
                <span key={c.category} className="text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-muted-foreground tabular-nums">{c.minutes}分</span>
                </span>
              ))}
            </div>
          )}

          {!state.isElectron && state.categoryBreakdown.length === 0 && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              需要 Electron 桌面版才能追踪应用
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
