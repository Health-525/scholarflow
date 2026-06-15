"use client";

import {
  Activity, BookOpen, Bot, Brain, CalendarDays, Calculator,
  ClipboardList, Clock, FileText, HeartPulse, LayoutDashboard,
  Library, Monitor, Newspaper, Settings, Sparkles, Target, Timer, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘", Icon: LayoutDashboard },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/exams", label: "考试", Icon: Clock },
  { href: "/gpa", label: "绩点", Icon: Calculator },
  { href: "/goals", label: "目标", Icon: Target },
  { href: "/pomodoro", label: "番茄钟", Icon: Timer },
  { href: "/notes", label: "笔记", Icon: FileText },
  { href: "/reports/daily", label: "日报", Icon: Newspaper },
  { href: "/knowledge", label: "知识画像", Icon: Brain },
  { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
  { href: "/progress", label: "学习进度", Icon: TrendingUp },
  { href: "/running", label: "跑步", Icon: Activity },
  { href: "/activity", label: "屏幕时间", Icon: Monitor },
  { href: "/library", label: "图书馆", Icon: Library },
  { href: "/chat", label: "AI 助手", Icon: Bot },
  { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
  { href: "/monitoring", label: "Agent", Icon: HeartPulse },
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
        "group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/[0.15] dark:text-white"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ].join(" ")}
    >
      {/* Active indicator bar */}
      <span
        className={[
          "shrink-0 w-1 h-5 rounded-full transition-all duration-150",
          active ? "bg-primary" : "bg-transparent",
        ].join(" ")}
        aria-hidden="true"
      />
      <Icon className={[
        "shrink-0 h-[16px] w-[16px] transition-colors duration-150",
        active ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground",
      ].join(" ")} />
      <span className="tracking-wide">{label}</span>
      {/* Hover accent dot */}
      {!active && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-muted-foreground/40"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

export function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-border/50 bg-card/60 backdrop-blur-2xl dark:bg-[#0a0a0f]/95 dark:border-white/[0.06]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      aria-label="侧边导航"
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-4" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[18px] font-semibold text-primary tracking-tight">
            Scholar
          </span>
          <span className="font-display text-[18px] font-semibold text-foreground tracking-tight">
            Flow
          </span>
        </div>
        <p className="text-[11px] mt-1 tracking-widest uppercase text-muted-foreground/50">
          学习管理中枢
        </p>
      </div>

      {/* Decorative divider */}
      <div className="mx-6 mb-3 flex items-center gap-2">
        <div className="flex-1 h-px bg-border/60" />
        <div className="w-1 h-1 rounded-full bg-primary/30" />
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* Nav items — flat list */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin" role="navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4 border-t border-border/40 pt-3">
        <NavItem href="/settings" label="用户中心" Icon={Settings} />
      </div>
    </aside>
  );
}

export default SideNav;
