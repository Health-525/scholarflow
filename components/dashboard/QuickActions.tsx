"use client";

import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/exams", label: "考试", Icon: Clock },
  { href: "/pomodoro", label: "番茄钟", Icon: Timer },
  { href: "/notes", label: "笔记", Icon: FileText },
];

export const QuickActions = memo(function QuickActions() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <action.Icon className="size-4" />
          <span>{action.label}</span>
        </Link>
      ))}
    </div>
  );
});

export default QuickActions;
