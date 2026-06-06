"use client";

import { useState, useEffect } from "react";
import { useActivityTrackerV3, downloadActivityCSV, clearActivityData, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/activity-tracker-v3";
import type { DayLog, Category } from "@/lib/activity-tracker-v3";
import { ChevronLeft, Trash2, Clock, Monitor } from "lucide-react";
import Link from "next/link";

export default function ActivityPage() {
  const state = useActivityTrackerV3();
  const [allDays, setAllDays] = useState<DayLog[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sf_activity_v3");
      if (raw) {
        const store = JSON.parse(raw) as Record<string, DayLog>;
        setAllDays(Object.values(store).filter(d => d.segments?.length > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7));
      }
    } catch {}
  }, []);

  const activeMins = Math.round(state.totalActiveMs / 60000);
  const idleMins = Math.round((state.idleMs + state.awayMs) / 60000);
  const totalMins = activeMins + idleMins || 1;
  const focusRate = Math.round((activeMins / totalMins) * 100);

  if (!state.isElectron && activeMins === 0) {
    return (
      <div className="pb-24 md:pb-0 max-w-4xl mx-auto">
        <Header />
        <div className="text-center py-20">
          <Monitor size={48} className="mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>需要 Electron 桌面版</h2>
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Web 浏览器无法检测桌面应用。请使用 ScholarFlow 桌面版。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-0 max-w-4xl mx-auto">
      <Header />

      {/* ── Big stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard value={activeMins} label="活跃 min" color="var(--status-success)" icon="🟢" />
        <StatCard value={idleMins} label="离开 min" color="#f59e0b" icon="🟡" />
        <StatCard value={`${focusRate}%`} label="使用率" color="var(--accent)" icon="📊" />
      </div>

      {/* ── Category breakdown ── */}
      {state.categoryBreakdown.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>活动分类</h3>
          {/* Stacked bar */}
          <div className="h-3 rounded-full overflow-hidden flex mb-3" style={{ background: "var(--surface)" }}>
            {state.categoryBreakdown.map(c => (
              <div key={c.category} className="h-full transition-all" style={{ width: `${(c.minutes / Math.max(activeMins, 1)) * 100}%`, background: c.color, minWidth: c.minutes > 0 ? 3 : 0 }} title={`${CATEGORY_LABELS[c.category as Category]}: ${c.minutes}min`} />
            ))}
          </div>
          {/* Category list */}
          <div className="space-y-1.5">
            {state.categoryBreakdown.map(c => (
              <div key={c.category} className="flex items-center gap-2 text-[12px]">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                <span style={{ color: "var(--text-primary)" }}>{CATEGORY_LABELS[c.category as Category]}</span>
                <div className="flex-1" />
                <span className="font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>{c.minutes}分</span>
                <span className="w-16 text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>{Math.round((c.minutes / Math.max(activeMins, 1)) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ALL apps breakdown ── */}
      {state.appBreakdown.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
            全部应用 ({state.appBreakdown.length})
          </h3>
          <div className="space-y-2">
            {state.appBreakdown.map(b => {
              const pct = Math.round((b.minutes / Math.max(activeMins, 1)) * 100);
              // Find category color for this app from today's segments
              const seg = state.todayLog.segments.find(s => s.app === b.app);
              const catColor = seg ? CATEGORY_COLORS[seg.category] : CATEGORY_COLORS.other;
              const catLabel = seg ? CATEGORY_LABELS[seg.category] : "";
              return (
                <div key={b.app} className="flex items-center gap-3">
                  <span className="text-[11px] w-24 shrink-0 truncate font-medium" style={{ color: "var(--text-primary)" }} title={b.app}>{b.app}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: catColor }} />
                  </div>
                  <span className="text-[10px] w-14 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{b.minutes}分</span>
                  <span className="text-[10px] w-7 text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Current tracking status ── */}
      <div className="rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>实时状态</h3>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{state.currentApp}</span>
          {state.currentTitle && (
            <span className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }} title={state.currentTitle}>
              — {state.currentTitle.slice(0, 50)}
            </span>
          )}
        </div>
      </div>

      {/* ── Export / Clear ── */}
      <div className="flex gap-3 mb-8">
        <button onClick={downloadActivityCSV} className="flex-1 py-3 rounded-xl text-[13px] font-medium" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          导出 CSV
        </button>
        <button onClick={() => { if (confirm("确定清除所有活动记录？")) { clearActivityData(); window.location.reload(); } }} className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl text-[13px] font-medium" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "#ef4444" }}>
          <Trash2 className="w-4 h-4" />清除
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-4 mb-6 py-4">
      <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}>
        <ChevronLeft className="w-5 h-5" />
      </Link>
      <div>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>活动分析</h1>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>实时追踪桌面应用使用时间</p>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon }: { value: number | string; label: string; color: string; icon: string }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[28px] font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{label}</div>
    </div>
  );
}
