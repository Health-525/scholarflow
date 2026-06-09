"use client";

import { useJwcNewsQuery } from "@/hooks/useQueries";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import type { GitHubError } from "@/lib/github/errors";

const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  "通知公告": "bg-primary",
  "教学动态": "bg-green-600",
};

const CATEGORY_TEXT_CLASSES: Record<string, string> = {
  "通知公告": "text-primary",
  "教学动态": "text-green-600",
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
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">教务通知</h2>
        </div>
        {fetchedLabel && (
          <span className="text-[11px] text-muted-foreground">{fetchedLabel}</span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-5 rounded" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      )}

      {ghError && !isLoading && (
        ghError.type === "not_found" ? (
          <div className="py-2">
            <p className="text-[12.5px] text-muted-foreground">暂无数据，教务通知将在每天早上 8:30 自动更新。</p>
          </div>
        ) : (
          <ErrorFallback message={ghError.message} onRetry={() => refetch()} />
        )
      )}

      {!isLoading && !ghError && (
        items.length === 0 ? (
          <p className="text-[12.5px] py-2 text-muted-foreground">暂无通知</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item: { title: string; url: string; date: string; category: string }, idx: number) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 py-2 group" aria-label={item.title}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${CATEGORY_COLOR_CLASSES[item.category] || "bg-muted-foreground"}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] line-clamp-1 transition-colors group-hover:underline text-foreground">{item.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.date && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">{item.date}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 ${CATEGORY_TEXT_CLASSES[item.category] || "text-muted-foreground"}`}>
                      {item.category}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 text-primary" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default JwcNewsCard;
