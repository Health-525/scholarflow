"use client";

import { Monitor } from "lucide-react";
import { useActivityTrackerV3, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/activity-tracker-v3";
import type { Category } from "@/lib/activity-tracker-v3";
import Link from "next/link";

export function ScreenTimeCard() {
  const state = useActivityTrackerV3();
  const activeMins = Math.round(state.totalActiveMs / 60000);
  const idleMins = Math.round((state.idleMs + state.awayMs) / 60000);
  const total = activeMins + idleMins || 1;
  const rate = Math.round((activeMins / total) * 100);

  return (
    <Link href="/activity" className="block sf-card p-5 animate-fade-up" style={{ display: "block" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)" }}>
          <Monitor className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>屏幕时间</h3>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{state.currentApp}</p>
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{activeMins}</span>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>活跃 min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full overflow-hidden flex" style={{ background: "var(--surface)" }}>
            <div className="h-full transition-all" style={{ width: `${rate}%`, background: "var(--accent)" }} />
          </div>
          <span className="text-[10px] font-medium tabular-nums" style={{ color: "var(--accent)" }}>{rate}%</span>
        </div>
      </div>

      {/* Category breakdown — stacked bar */}
      {state.categoryBreakdown.length > 0 && (
        <div className="mb-3">
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface)" }}>
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
                <span style={{ color: "var(--text-secondary)" }}>
                  {CATEGORY_LABELS[c.category as Category]?.replace(/^.\s/, "") || c.category}
                </span>
                <span className="tabular-nums" style={{ color: "var(--text-tertiary)" }}>{c.minutes}分</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 apps — secondary */}
      {state.appBreakdown.length > 0 && (
        <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {state.appBreakdown.slice(0, 3).map(b => (
            <div key={b.app} className="flex items-center gap-2 text-[10px] mt-1">
              <span className="w-14 truncate" style={{ color: "var(--text-secondary)" }}>{b.app}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "var(--surface)" }}>
                <div className="h-full rounded-full" style={{ width: `${(b.minutes / Math.max(activeMins, 1)) * 100}%`, background: "var(--accent-soft)" }} />
              </div>
              <span className="tabular-nums w-7 text-right" style={{ color: "var(--text-tertiary)" }}>{b.minutes}分</span>
            </div>
          ))}
        </div>
      )}

      {state.categoryBreakdown.length === 0 && state.appBreakdown.length === 0 && (
        <div className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {state.isElectron
            ? `正在追踪... 当前：${state.currentApp}`
            : "需要 Electron 桌面版才能追踪应用"}
        </div>
      )}
    </Link>
  );
}
