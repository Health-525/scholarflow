"use client";

import { Newspaper } from "lucide-react";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useJwcNewsQuery } from "@/hooks/useQueries";

const CATEGORY_STYLES: Record<string, { dot: string; text: string }> = {
  "通知公告": { dot: "bg-primary", text: "text-primary" },
  "教学动态": { dot: "bg-statusSuccess", text: "text-statusSuccess" },
};

export const JwcNewsCard = memo(function JwcNewsCard() {
  const { data, isLoading, error, refetch } = useJwcNewsQuery();
  const items = (data?.items ?? []).slice(0, 6);
  const fetchedAt = data?.fetchedAt ?? "";
  const fetchError = error as Error | null;

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 更新"
    : "";

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Newspaper className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">教务通知</h2>
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
            <p className="text-sm py-3 text-muted-foreground">暂无通知</p>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((item: { title: string; url: string; date: string; category: string }) => {
                const style = CATEGORY_STYLES[item.category] || { dot: "bg-muted-foreground", text: "text-muted-foreground" };
                return (
                  <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-2 group transition-colors hover:bg-muted/30 rounded-lg px-2 -mx-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-150 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm line-clamp-1 transition-colors group-hover:text-primary text-foreground">{item.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.date && <span className="text-xs tabular-nums text-muted-foreground">{item.date}</span>}
                        <Badge variant="secondary" className={`text-xs h-4 px-1 border-transparent ${style.text} bg-transparent`}>
                          {item.category}
                        </Badge>
                      </div>
                    </div>
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
