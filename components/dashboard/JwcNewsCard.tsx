"use client";

import { useJwcNewsQuery } from "@/hooks/useQueries";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import type { GitHubError } from "@/lib/github/errors";

const CATEGORY_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  "通知公告": { dot: "bg-primary", bg: "bg-primary/5", text: "text-primary" },
  "教学动态": { dot: "bg-green-600", bg: "bg-green-600/5", text: "text-green-600" },
};

export function JwcNewsCard() {
  const { data, isLoading, error, refetch } = useJwcNewsQuery();
  const items = (data?.items ?? []).slice(0, 8);
  const fetchedAt = data?.fetchedAt ?? "";
  const ghError = error as GitHubError | null;

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 更新"
    : "";

  return (
    <div className="sf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">教务通知</h2>
        </div>
        {fetchedLabel && (
          <span className="text-[11px] text-muted-foreground">{fetchedLabel}</span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-6 rounded" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      )}

      {ghError && !isLoading && (
        ghError.type === "not_found" ? (
          <div className="py-3">
            <p className="text-[12.5px] text-muted-foreground">暂无数据，教务通知将在每天早上 8:30 自动更新。</p>
          </div>
        ) : (
          <ErrorFallback message={ghError.message} onRetry={() => refetch()} />
        )
      )}

      {!isLoading && !ghError && (
        items.length === 0 ? (
          <p className="text-[12.5px] py-3 text-muted-foreground">暂无通知</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item: { title: string; url: string; date: string; category: string }, idx: number) => {
              const style = CATEGORY_STYLES[item.category] || { dot: "bg-muted-foreground", bg: "bg-secondary", text: "text-muted-foreground" };
              return (
                <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 py-2.5 group transition-colors" aria-label={item.title}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-150 ${style.dot}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] line-clamp-1 transition-colors group-hover:text-primary text-foreground">{item.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.date && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">{item.date}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${style.bg} ${style.text}`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 text-primary" aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default JwcNewsCard;