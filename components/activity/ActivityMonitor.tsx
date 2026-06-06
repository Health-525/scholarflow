"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActivityTrackerV3 } from "@/lib/activity-tracker-v3";

export function ActivityMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const state = useActivityTrackerV3();

  const totalMins = Math.round((state.totalActiveMs + state.idleMs + state.awayMs) / 60000) || 1;
  const activeMins = Math.round(state.totalActiveMs / 60000);
  const focusRate = Math.round((activeMins / totalMins) * 100);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-6 right-20 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: state.isElectron ? "var(--accent)" : "var(--status-success)", color: "#fff" }}
        aria-label={`活动记录，当前: ${state.currentApp}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed bottom-56 md:bottom-20 right-4 z-50 w-[340px] rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "460px" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>今日活动</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: state.isElectron ? "var(--accent-soft)" : "var(--surface)", color: state.isElectron ? "var(--accent)" : "var(--text-tertiary)" }}>
                {state.isElectron ? "Electron" : "Web"}
              </span>
            </div>

            <div className="px-4 py-3">
              {/* Current */}
              <div className="flex items-center justify-center gap-2 py-2 mb-3 text-[13px] font-medium rounded-lg" style={{ background: "var(--surface)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--status-success)", animation: "pulse 2s infinite" }} />
                <span style={{ color: "var(--text-primary)" }}>{state.currentApp}</span>
                {state.currentTitle && (
                  <span className="text-[11px] truncate max-w-[160px]" style={{ color: "var(--text-tertiary)" }}>{state.currentTitle}</span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1"><div className="text-xl font-bold tabular-nums" style={{ color: "var(--status-success)" }}>{activeMins}</div><div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>活跃 min</div></div>
                <div className="w-px h-8" style={{ background: "var(--border)" }} />
                <div className="text-center flex-1"><div className="text-xl font-bold tabular-nums" style={{ color: "#f59e0b" }}>{Math.round((state.idleMs + state.awayMs) / 60000)}</div><div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>离开 min</div></div>
                <div className="w-px h-8" style={{ background: "var(--border)" }} />
                <div className="text-center flex-1"><div className="text-xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>{focusRate}%</div><div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>使用率</div></div>
              </div>

              {/* App breakdown */}
              {state.appBreakdown.filter(b => b.app !== "使用电脑").length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>应用使用分布</div>
                  {state.appBreakdown.filter(b => b.app !== "使用电脑").slice(0, 7).map(b => {
                    const max = Math.max(...state.appBreakdown.map(x => x.minutes), 1);
                    return (
                      <div key={b.app} className="flex items-center gap-2">
                        <span className="text-[11px] w-16 shrink-0 truncate" style={{ color: "var(--text-secondary)" }}>{b.app}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--surface)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(b.minutes / max) * 100}%`, background: "var(--accent)" }} />
                        </div>
                        <span className="text-[10px] w-8 text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>{b.minutes}分</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {state.appBreakdown.length === 0 && (
                <p className="text-center text-[12px] py-3" style={{ color: "var(--text-tertiary)" }}>
                  {state.isElectron ? "开始使用，应用将自动记录" : "启动 Electron 版以追踪应用使用"}
                </p>
              )}

              <div className="flex justify-end mt-2">
                <button onClick={() => { setIsOpen(false); router.push("/activity"); }} className="text-[11px] font-medium hover:underline" style={{ color: "var(--accent)" }}>详细分析 →</button>
              </div>
            </div>

            <div className="px-4 py-2 text-[10px]" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              {state.isElectron ? "自动检测活动窗口 · 数据仅存本地" : "Web 模式只能检测活跃/空闲 · 下载 Electron 版追踪应用"}
            </div>
          </div>
        </>
      )}
    </>
  );
}
