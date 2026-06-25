"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDailyReports } from "@/hooks/useReports";

function formatDateLabel(dateStr: string): { main: string; sub: string } {
  try {
    const d = new Date(dateStr);
    return {
      main: d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
      sub: d.toLocaleDateString("zh-CN", { weekday: "short" }),
    };
  } catch { return { main: dateStr, sub: "" }; }
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

export const RecentDailyCard = memo(function RecentDailyCard() {
  const { entries, isLoading, error, reload } = useDailyReports();
  const recent = entries.slice(0, 5);
  const isAuthError = /unauthorized|forbidden|401|403/i.test(
    error?.message ?? "",
  );

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">最近日报</h2>
          </div>
          <Link href="/reports/daily" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            查看全部
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-6 rounded" style={{ width: `${60 + i * 7}%` }} />)}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>{isAuthError ? "日报暂时无法同步" : "日报加载失败"}</span>
              <button
                type="button"
                onClick={reload}
                className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">暂无日报</p>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((entry) => {
                const date = entry.name.replace(".md", "");
                const { main, sub } = formatDateLabel(date);
                const recency = recencyLabel(date);
                return (
                  <Link key={entry.path} href={`/reports/daily?date=${encodeURIComponent(date)}`} className="flex items-center justify-between gap-3 py-2.5 group transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1 h-1 rounded-full shrink-0 bg-border group-hover:bg-primary transition-colors" />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{main}</span>
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </div>
                    {recency && (
                      <Badge variant="secondary" className="text-xs h-4 px-1 gap-1">
                        {recency}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
});

export default RecentDailyCard;
