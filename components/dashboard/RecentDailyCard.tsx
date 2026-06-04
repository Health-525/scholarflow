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

// Is today or yesterday
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
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} aria-hidden="true" />
          <h2
            className="text-[13px] font-semibold tracking-wide"
            style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
          >
            最近日报
          </h2>
        </div>
        <Link
          href="/reports/daily"
          className="text-[11px] tracking-wide transition-colors hover:opacity-70"
          style={{ color: "var(--accent)" }}
          aria-label="查看全部日报"
        >
          查看全部 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-5 rounded" style={{ width: `${60 + i * 7}%` }} />)}
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        recent.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>暂无日报</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {recent.map((entry) => {
              const date = entry.name.replace(".md", "");
              const { main, sub } = formatDateLabel(date);
              const recency = recencyLabel(date);

              return (
                <Link
                  key={entry.path}
                  href={`/reports/daily/${date}`}
                  className="flex items-center justify-between gap-3 py-2 group"
                  aria-label={`日报：${main} ${sub}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Dot */}
                    <span
                      className="w-1 h-1 rounded-full shrink-0 transition-transform group-hover:scale-150"
                      style={{ background: "var(--border-strong)" }}
                      aria-hidden="true"
                    />
                    <span className="text-[12.5px]" style={{ color: "var(--text-primary)" }}>
                      {main}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {sub}
                    </span>
                  </div>
                  {recency && (
                    <span className="sf-chip sf-chip-accent shrink-0" style={{ fontSize: "10px" }}>
                      {recency}
                    </span>
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
