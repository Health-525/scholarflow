"use client";

import { Newspaper } from "lucide-react";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useJwcNewsQuery } from "@/hooks/useQueries";

const CATEGORY_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  "通知公告": { dot: "bg-primary", bg: "bg-primary/5", text: "text-primary" },
  "教学动态": { dot: "bg-[var(--status-success)]", bg: "bg-[var(--status-success)]/10", text: "text-[var(--status-success)]" },
};

export const JwcNewsCard = memo(function JwcNewsCard() {
  const { data, isLoading, error, refetch } = useJwcNewsQuery();
  const items = (data?.items ?? []).slice(0, 8);
  const fetchedAt = data?.fetchedAt ?? "";
  const fetchError = error as Error | null;

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 更新"
    : "";

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
              <Newspaper className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold font-display text-foreground">教务通知</h2>
          </div>
          {fetchedLabel && (
            <span className="text-xs text-muted-foreground">{fetchedLabel}</span>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton h-6 rounded" style={{ width: `${60 + i * 8}%` }} />
            ))}
          </div>
        )}

        {fetchError && !isLoading && (
          <ErrorFallback message={fetchError.message} onRetry={() => refetch()} />
        )}

        {!isLoading && !fetchError && (
          items.length === 0 ? (
            <p className="text-[12.5px] py-3 text-muted-foreground">暂无通知</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item: { title: string; url: string; date: string; category: string }, idx: number) => {
                const style = CATEGORY_STYLES[item.category] || { dot: "bg-muted-foreground", bg: "bg-secondary", text: "text-muted-foreground" };
                return (
                  <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 py-2.5 group transition-colors">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-150 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] line-clamp-1 transition-colors group-hover:text-primary text-foreground">{item.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.date && <span className="text-xs tabular-nums text-muted-foreground">{item.date}</span>}
                        <Badge variant="outline" className={`text-xs h-4 px-1 border-transparent ${style.bg} ${style.text}`}>
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs opacity-0 shrink-0 mt-1 text-primary">↗</span>
                  </a>
                );
              })}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
});

export default JwcNewsCard;
