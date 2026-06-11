"use client";

import Link from "next/link";
import {
  CalendarDays, ClipboardList, Activity, Clock, Bot,
  FileText, Timer, TrendingUp, Library, Brain,
} from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/schedule",      label: "课表",   Icon: CalendarDays,  color: "#2a4494", darkColor: "#7c8edb" },
  { href: "/assignments",   label: "作业",   Icon: ClipboardList, color: "#16a34a", darkColor: "#3fb950" },
  { href: "/running",       label: "跑步",   Icon: Activity,      color: "#f59e0b", darkColor: "#d29922" },
  { href: "/exams",         label: "考试",   Icon: Clock,         color: "#ef4444", darkColor: "#f85149" },
  { href: "/pomodoro",      label: "番茄钟", Icon: Timer,         color: "#8b5cf6", darkColor: "#a78bfa" },
  { href: "/chat",          label: "AI",     Icon: Bot,           color: "#06b6d4", darkColor: "#2dd4bf" },
  { href: "/notes",         label: "笔记",   Icon: FileText,      color: "#64748b", darkColor: "#c9d1d9" },
  { href: "/progress",      label: "进度",   Icon: TrendingUp,    color: "#2a4494", darkColor: "#7c8edb" },
  { href: "/library",       label: "图书馆", Icon: Library,       color: "#f59e0b", darkColor: "#d29922" },
  { href: "/knowledge",     label: "知识",   Icon: Brain,         color: "#8b5cf6", darkColor: "#a78bfa" },
];

export function QuickActions() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 mb-3">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 hover:bg-secondary/80 active:scale-95 shrink-0 border border-transparent hover:border-border/50 group backdrop-blur-sm"
        >
          <action.Icon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: action.color }} />
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;