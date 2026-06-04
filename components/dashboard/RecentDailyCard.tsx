"use client";

import Link from "next/link";
import { useDailyReports } from "@/hooks/useReports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export function RecentDailyCard() {
  const { entries, isLoading, error, reload } = useDailyReports();

  const recent = entries.slice(0, 5);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          📖 最近日报
        </h2>
        <Link
          href="/reports/daily"
          className="text-xs"
          style={{ color: "var(--accent)" }}
          aria-label="查看全部日报"
        >
          查看全部
        </Link>
      </div>

      {isLoading && <LoadingSpinner size="sm" />}
      {error && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        <>
          {recent.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              暂无日报
            </p>
          ) : (
            <div className="space-y-1.5">
              {recent.map((entry) => {
                const date = entry.name.replace(".md", "");
                let label = date;
                try {
                  label = new Date(date).toLocaleDateString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  });
                } catch {
                  // keep raw
                }
                return (
                  <Link
                    key={entry.path}
                    href={`/reports/daily/${date}`}
                    className="block text-xs py-1"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label={`日报：${label}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RecentDailyCard;
