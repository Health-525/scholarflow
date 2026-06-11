"use client";

import Link from "next/link";
import { useDailyReports } from "@/hooks/useReports";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

function formatDateLabel(dateStr: string): { main: string; sub: string } {
  try {
    const d = new Date(dateStr);
    const main = d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    const sub  = d.toLocaleDateString("zh-CN", { weekday: "short" });
    return { main, sub };
  } catch {
    return { main: dateStr, sub: "" };
  }
}

function recencyLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    const diff = (today.getTime() - target.getTime()) / 86400000;
    if (diff === 0) return "今天";
    if (diff === 1) return "昨天";
    return "";
  } catch { return ""; }
}

export function RecentDailyCard() {
  const { entries, isLoading, error, reload } = useDailyReports();
  const recent = entries.slice(0, 5);

  return (
    <div className="sf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">最近日报</h2>
        </div>
        <Link href="/reports/daily" className="text-[11px] tracking-wide transition-colors hover:opacity-70 text-primary" aria-label="查看全部日报">
          查看全部 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-6 rounded" style={{ width: `${60 + i * 7}%` }} />)}
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        recent.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-3">暂无日报</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((entry) => {
              const date = entry.name.replace(".md", "");
              const { main, sub } = formatDateLabel(date);
              const recency = recencyLabel(date);

              return (
                <Link key={entry.path} href={`/reports/daily/${date}`} className="flex items-center justify-between gap-3 py-2.5 group transition-colors" aria-label={`日报：${main} ${sub}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-1 h-1 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-150 bg-border" aria-hidden="true" />
                    <span className="text-[12.5px] text-foreground group-hover:text-primary transition-colors">{main}</span>
                    <span className="text-[11px] text-muted-foreground">{sub}</span>
                  </div>
                  {recency && (
                    <span className="sf-chip sf-chip-accent text-[10px]">{recency}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default RecentDailyCard;