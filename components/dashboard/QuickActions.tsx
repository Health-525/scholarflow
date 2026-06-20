"use client";

import {
  CalendarDays,
  ClipboardList,
  Activity,
  Clock,
  FileText,
  Timer,
  Library,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { semanticColor } from "@/lib/theme-colors";
import type { SemanticColorType } from "@/lib/theme-colors";

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  Icon: LucideIcon;
  colorType: SemanticColorType;
}> = [
  { href: "/schedule", label: "课表", Icon: CalendarDays, colorType: "primary" },
  { href: "/assignments", label: "作业", Icon: ClipboardList, colorType: "success" },
  { href: "/running", label: "跑步", Icon: Activity, colorType: "warning" },
  { href: "/exams", label: "考试", Icon: Clock, colorType: "error" },
  { href: "/pomodoro", label: "番茄钟", Icon: Timer, colorType: "info" },
  { href: "/notes", label: "笔记", Icon: FileText, colorType: "info" },
  { href: "/library", label: "图书馆", Icon: Library, colorType: "warning" },
];

export function QuickActions() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 mb-3">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-200 bg-card hover:bg-secondary dark:bg-secondary/80 dark:hover:bg-muted active:scale-95 shrink-0 shadow-sm hover:shadow-md group"
        >
          <action.Icon
            className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ color: semanticColor(action.colorType) }}
          />
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
