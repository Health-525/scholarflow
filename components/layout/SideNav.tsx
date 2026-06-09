"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Activity, Target,
  FileText, Newspaper, Monitor, Calculator, Clock, HeartPulse, Brain, BookOpen, Library, Timer, Sparkles, User,
  Sun, Moon,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { ThemeValue } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/",                label: "仪表板", Icon: LayoutDashboard },
  { href: "/schedule",        label: "课表",   Icon: CalendarDays },
  { href: "/assignments",     label: "作业",   Icon: ClipboardList },
  { href: "/goals",           label: "目标",   Icon: Target },
  { href: "/pomodoro",        label: "番茄钟", Icon: Timer },
  { href: "/running",         label: "跑步",   Icon: Activity },
  { href: "/notes",           label: "笔记",   Icon: FileText },
  { href: "/reports/daily",   label: "日报",   Icon: Newspaper },
  { href: "/exams",           label: "考试",   Icon: Clock },
  { href: "/gpa",             label: "绩点",   Icon: Calculator },
  { href: "/activity",        label: "屏幕时间", Icon: Monitor },
  { href: "/monitoring",      label: "Agent",   Icon: HeartPulse },
  { href: "/knowledge",       label: "知识画像", Icon: Brain },
  { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
  { href: "/library",         label: "图书馆", Icon: Library },
  { href: "/wrinkle",         label: "皮肤检测", Icon: Sparkles },
];

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark",  label: "深色", Icon: Moon },
  { value: "system", label: "系统", Icon: Monitor },
];

export function SideNav() {
  const pathname = usePathname();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="hidden md:flex flex-col w-52 shrink-0 h-screen sticky top-0 bg-card/80 border-r border-border backdrop-blur-2xl"
      aria-label="侧边导航"
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <Image src="/icons/logo.png" alt="ScholarFlow logo" width={32} height={32} className="rounded-lg shrink-0" style={{ objectFit: "cover" }} />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg text-primary">Scholar</span>
              <span className="font-display text-lg text-foreground">Flow</span>
            </div>
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground">学习管理中枢</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 mb-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <div className="w-1 h-1 rounded-full bg-primary/10" />
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span className={`shrink-0 w-1 h-5 rounded-full transition-all duration-150 ${active ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
              <item.Icon className={`shrink-0 w-4 h-4 transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className="tracking-wide">{item.label}</span>
              {!active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-muted-foreground" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme + User Center */}
      <div className="px-3 pb-5 border-t border-border pt-2.5">
        <div className="px-3 py-2 mb-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground">外观</span>
          </div>
          <div className="flex gap-1">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  theme === opt.value ? "bg-primary/10 text-primary border border-primary/10" : "text-muted-foreground border border-transparent hover:text-foreground"
                }`}
                aria-label={`切换到${opt.label}模式`}
                aria-pressed={theme === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/settings"
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${isActive("/settings") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          aria-label="用户中心"
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <span className={`shrink-0 w-1 h-5 rounded-full transition-all duration-150 ${isActive("/settings") ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
            <User className="w-3 h-3 text-primary" />
          </div>
          <span className="tracking-wide">用户中心</span>
          {!isActive("/settings") && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-muted-foreground" aria-hidden="true" />
          )}
        </Link>
      </div>
    </aside>
  );
}

export default SideNav;
