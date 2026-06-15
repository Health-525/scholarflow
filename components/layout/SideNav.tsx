"use client";

import {
  Activity, BookOpen, Bot, Brain, CalendarDays, Calculator,
  ClipboardList, Clock, FileText, HeartPulse, LayoutDashboard,
  Library, Monitor, Newspaper, Settings, Sparkles, Target, Timer, TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_ITEMS = [
  { href: "/", label: "仪表盘", Icon: LayoutDashboard },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/exams", label: "考试", Icon: Clock },
  { href: "/goals", label: "目标", Icon: Target },
  { href: "/pomodoro", label: "番茄钟", Icon: Timer },
  { href: "/running", label: "跑步", Icon: Activity },
  { href: "/activity", label: "屏幕时间", Icon: Monitor },
  { href: "/notes", label: "笔记", Icon: FileText },
  { href: "/reports/daily", label: "日报", Icon: Newspaper },
  { href: "/gpa", label: "绩点", Icon: Calculator },
  { href: "/knowledge", label: "知识画像", Icon: Brain },
  { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
  { href: "/progress", label: "学习进度", Icon: TrendingUp },
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      ].join(" ")}
    >
      {active && (
        <span className="absolute inset-y-2 left-1 w-[2px] rounded-full bg-foreground/70" aria-hidden="true" />
      )}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.1 : 1.8} />
      <span>{label}</span>
    </Link>
  );
}

export function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-border bg-sidebar"
      aria-label="主导航"
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-3" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <Image
            src="/icons/logo.png"
            alt="ScholarFlow"
            width={28}
            height={28}
            className="rounded-md shrink-0"
            style={{ objectFit: "cover" }}
          />
          <span className="font-display text-[15px] font-semibold text-foreground">
            ScholarFlow
          </span>
        </div>
      </div>

      {/* Navigation — flat list */}
      <nav className="flex-1 px-3 overflow-y-auto" role="navigation">
        <div className="space-y-0.5">
          {PRIMARY_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Settings */}
      <div className="px-3 py-3 border-t border-border">
        <NavItem href="/settings" label="用户中心" Icon={Settings} />
      </div>
    </aside>
  );
}

export default SideNav;
