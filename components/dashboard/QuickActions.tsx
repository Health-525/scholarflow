"use client";

import {
  CalendarDays, ClipboardList, Activity, Clock, Bot,
  FileText, Timer, TrendingUp, Library, Brain,
} from "lucide-react";
import Link from "next/link";

const QUICK_ACTIONS = [
  { href: "/schedule",      label: "课表",   Icon: CalendarDays },
  { href: "/assignments",   label: "作业",   Icon: ClipboardList },
  { href: "/running",       label: "跑步",   Icon: Activity },
  { href: "/exams",         label: "考试",   Icon: Clock },
  { href: "/pomodoro",      label: "番茄钟", Icon: Timer },
  { href: "/chat",          label: "AI",     Icon: Bot },
  { href: "/notes",         label: "笔记",   Icon: FileText },
  { href: "/progress",      label: "进度",   Icon: TrendingUp },
  { href: "/library",       label: "图书馆", Icon: Library },
  { href: "/knowledge",     label: "知识",   Icon: Brain },
];

export function QuickActions() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 hover:bg-secondary shrink-0 border border-border bg-card group"
        >
          <action.Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
