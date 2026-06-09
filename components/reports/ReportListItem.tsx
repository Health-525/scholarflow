"use client";

import Link from "next/link";
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
      className="flex items-center justify-between px-4 py-3 rounded-2xl transition-opacity active:opacity-70 bg-card border border-border"
      aria-label={`查看${type === "daily" ? "日报" : "周报"}：${label}`}
    >
      <div>
        <div className="text-sm font-medium text-foreground">
          {label}
        </div>
        <div className="text-xs mt-0.5 text-muted-foreground">
          {type === "daily" ? "📄 日报" : "📋 周报"}
        </div>
      </div>
      <span className="text-muted-foreground" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export default ReportListItem;
