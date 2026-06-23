"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DirectoryEntry } from "@/types";

interface ReportListItemProps {
  entry: DirectoryEntry;
  type: "daily" | "weekly";
}

function formatDailyLabel(filename: string): string {
  const date = filename.replace(".md", "");
  try {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return date;
  }
}

function formatWeeklyLabel(filename: string): string {
  const slug = filename.replace(".md", "");
  const parts = slug.split("_");
  if (parts.length >= 2) {
    try {
      const start = new Date(parts[0]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      const end = new Date(parts[1]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      return `${start} — ${end}`;
    } catch {
      return slug;
    }
  }
  return slug;
}

export function ReportListItem({ entry, type }: ReportListItemProps) {
  const slug = entry.name.replace(".md", "");
  const href = type === "daily" ? `/reports/daily?date=${encodeURIComponent(slug)}` : `/reports/weekly/${slug}`;
  const label = type === "daily" ? formatDailyLabel(entry.name) : formatWeeklyLabel(entry.name);
  const isAi = entry.ai;

  return (
    <Link
      href={href}
      className="block"
      aria-label={`查看${type === "daily" ? "日报" : "周报"}：${label}`}
    >
      <Card className="flex-row items-center justify-between px-4 py-3 group hover:border-primary/30 transition-colors">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {label}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary">
              {type === "daily" ? "日报" : "周报"}
            </Badge>
            {type === "weekly" && entry.theme && (
              <Badge variant="outline" className="text-primary border-primary/30 font-normal">
                {entry.theme}
              </Badge>
            )}
            {isAi && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 font-normal">
                AI
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2 group-hover:text-primary transition-colors" aria-hidden="true" />
      </Card>
    </Link>
  );
}

export default ReportListItem;
