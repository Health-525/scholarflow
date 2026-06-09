"use client";

import { Monitor } from "lucide-react";
import { useActivityTrackerV3, CATEGORY_LABELS } from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import Link from "next/link";

export function ScreenTimeCard() {
  const state = useActivityTrackerV3();
  const activeMins = Math.round(state.totalActiveMs / 60000);
  const idleMins = Math.round((state.idleMs + state.awayMs) / 60000);
  const total = activeMins + idleMins || 1;
  const rate = Math.round((activeMins / total) * 100);

  return (
    <Link href="/activity" className="block sf-card p-5 animate-fade-up">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
          <Monitor className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">屏幕时间</h3>
          <p className="text-[10px] text-muted-foreground">{state.currentApp}</p>
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">{activeMins}</span>
          <span className="text-[11px] text-muted-foreground">活跃 min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full overflow-hidden flex bg-secondary">
            <div className="h-full transition-all bg-primary" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-[10px] font-medium tabular-nums text-primary">{rate}%</span>
        </div>
      </div>

      {/* Category breakdown */}
      {state.categoryBreakdown.length > 0 && (
        <div className="mb-3">
          <div className="h-2 rounded-full overflow-hidden flex bg-secondary">
            {state.categoryBreakdown.map(c => (
              <div
                key={c.category}
                className="h-full transition-all"
                style={{
                  width: `${(c.minutes / Math.max(activeMins, 1)) * 100}%`,
                  background: c.color,
                  minWidth: c.minutes > 0 ? "2px" : 0,
                }}
                title={`${CATEGORY_LABELS[c.category as Category] || c.category}: ${c.minutes}min`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {state.categoryBreakdown.slice(0, 4).map(c => (
              <span key={c.category} className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-muted-foreground">{CATEGORY_LABELS[c.category as Category]?.replace(/^.\s/, "") || c.category}</span>
                <span className="tabular-nums text-muted-foreground/60">{c.minutes}分</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 apps */}
      {state.appBreakdown.length > 0 && (
        <div className="pt-2 border-t border-border">
          {state.appBreakdown.slice(0, 3).map(b => (
            <div key={b.app} className="flex items-center gap-2 text-[10px] mt-1">
              <span className="w-14 truncate text-muted-foreground">{b.app}</span>
              <div className="flex-1 h-1 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary/15" style={{ width: `${(b.minutes / Math.max(activeMins, 1)) * 100}%` }} />
              </div>
              <span className="tabular-nums w-7 text-right text-muted-foreground/60">{b.minutes}分</span>
            </div>
          ))}
        </div>
      )}

      {state.categoryBreakdown.length === 0 && state.appBreakdown.length === 0 && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          {state.isElectron ? `正在追踪... 当前：${state.currentApp}` : "需要 Electron 桌面版才能追踪应用"}
        </div>
      )}
    </Link>
  );
}
