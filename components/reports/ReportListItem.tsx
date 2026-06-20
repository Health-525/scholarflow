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
  const href = type === "daily" ? `/reports/daily/${slug}` : `/reports/weekly/${slug}`;
  const label = type === "daily" ? formatDailyLabel(entry.name) : formatWeeklyLabel(entry.name);

  return (
    <Link
      href={href}
      className="block"
      aria-label={`查看${type === "daily" ? "日报" : "周报"}：${label}`}
    >
      <Card className="flex-row items-center justify-between px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">
            {label}
          </div>
          <Badge variant="secondary" className="mt-1.5">
            {type === "daily" ? "日报" : "周报"}
          </Badge>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </Card>
    </Link>
  );
}

export default ReportListItem;
