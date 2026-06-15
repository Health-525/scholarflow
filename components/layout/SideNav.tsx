"use client";

import {
  Activity, BookOpen, Bot, Brain, CalendarDays, Calculator,
  ClipboardList, Clock, FileText, HeartPulse, LayoutDashboard,
  Library, Monitor, Newspaper, Settings, Sparkles, Target, Timer, TrendingUp,
  ChevronDown, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// ── 分组导航 ──────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "核心",
    items: [
      { href: "/", label: "仪表盘", Icon: LayoutDashboard },
      { href: "/schedule", label: "课表", Icon: CalendarDays },
      { href: "/assignments", label: "作业", Icon: ClipboardList },
      { href: "/exams", label: "考试", Icon: Clock },
      { href: "/gpa", label: "绩点", Icon: Calculator },
    ],
  },
  {
    label: "学习",
    items: [
      { href: "/goals", label: "目标", Icon: Target },
      { href: "/pomodoro", label: "番茄钟", Icon: Timer },
      { href: "/notes", label: "笔记", Icon: FileText },
      { href: "/reports/daily", label: "日报", Icon: Newspaper },
      { href: "/knowledge", label: "知识画像", Icon: Brain },
      { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
      { href: "/progress", label: "学习进度", Icon: TrendingUp },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/running", label: "跑步", Icon: Activity },
      { href: "/activity", label: "屏幕时间", Icon: Monitor },
      { href: "/library", label: "图书馆", Icon: Library },
      { href: "/chat", label: "AI 助手", Icon: Bot },
      { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
      { href: "/monitoring", label: "Agent", Icon: HeartPulse },
    ],
  },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: typeof LayoutDashboard }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/[0.15] dark:text-white"
          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
      ].join(" ")}
    >
      {active && (
        <span className="absolute inset-y-1 left-0.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
      )}
      <Icon className={[
        "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground",
      ].join(" ")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavGroup({ label, items }: { label: string; items: typeof NAV_GROUPS[number]["items"] }) {
  const pathname = usePathname();
  const hasActive = items.some(item =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
        aria-expanded={expanded}
      >
        <span className="flex-1">{label}</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="space-y-0.5 mt-0.5">
          {items.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border/60 bg-card/50 backdrop-blur-xl dark:bg-[#0a0a0f]/95 dark:border-white/[0.06]"
      aria-label="主导航"
    >
      {/* Logo — 拖拽区域 */}
      <div className="px-4 pt-4 pb-2" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Image
              src="/icons/logo.png"
              alt="ScholarFlow"
              width={24}
              height={24}
              className="rounded-lg shrink-0"
              style={{ objectFit: "cover" }}
            />
          </div>
          <span className="font-display text-[16px] font-semibold tracking-tight text-foreground">
            ScholarFlow
          </span>
        </div>
      </div>

      {/* 分组导航 */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto scrollbar-thin" role="navigation">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} {...group} />
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 py-2 border-t border-border/40">
        <NavItem href="/settings" label="用户中心" Icon={Settings} />
      </div>
    </aside>
  );
}

export default SideNav;
