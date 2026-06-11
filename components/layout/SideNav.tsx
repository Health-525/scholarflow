"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  Calculator,
  ClipboardList,
  Clock,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Library,
  Monitor,
  Moon,
  Newspaper,
  Sparkles,
  Sun,
  Target,
  Timer,
  TrendingUp,
  User,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { ThemeValue } from "@/lib/theme";

const NAV_GROUPS = [
  {
    label: "日常",
    items: [
      { href: "/", label: "仪表盘", Icon: LayoutDashboard },
      { href: "/schedule", label: "课表", Icon: CalendarDays },
      { href: "/assignments", label: "作业", Icon: ClipboardList },
      { href: "/exams", label: "考试", Icon: Clock },
      { href: "/goals", label: "目标", Icon: Target },
      { href: "/pomodoro", label: "番茄钟", Icon: Timer },
    ],
  },
  {
    label: "运动",
    items: [
      { href: "/running", label: "跑步", Icon: Activity },
      { href: "/activity", label: "屏幕时间", Icon: Monitor },
    ],
  },
  {
    label: "学习",
    items: [
      { href: "/notes", label: "笔记", Icon: FileText },
      { href: "/reports/daily", label: "日报", Icon: Newspaper },
      { href: "/gpa", label: "绩点", Icon: Calculator },
      { href: "/knowledge", label: "知识画像", Icon: Brain },
      { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
      { href: "/progress", label: "学习进度", Icon: TrendingUp },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/library", label: "图书馆", Icon: Library },
      { href: "/chat", label: "AI 助手", Icon: Bot },
      { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
      { href: "/monitoring", label: "Agent", Icon: HeartPulse },
    ],
  },
];

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "系统", Icon: Monitor },
];

export function SideNav() {
  const pathname = usePathname();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside
      className="dark-nav-panel hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-border bg-card/80 backdrop-blur-2xl dark:border-transparent"
      aria-label="侧边导航"
    >
      <div className="px-6 pt-7 pb-6" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md dark:bg-primary/12" aria-hidden="true" />
            <Image
              src="/icons/logo.png"
              alt="ScholarFlow logo"
              width={34}
              height={34}
              className="relative rounded-xl shrink-0 border border-primary/10 dark:border-transparent"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg text-primary">Scholar</span>
              <span className="font-display text-lg text-foreground">Flow</span>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Study hub</p>
          </div>
        </div>
      </div>

      <div className="mx-6 mb-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex-1 h-px bg-border" />
      </div>

      <nav className="flex-1 px-3 overflow-y-auto" aria-label="主导航">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60 flex items-center gap-2">
              <div className="w-2 h-px bg-muted-foreground/20" />
              {group.label}
              <div className="flex-1 h-px bg-muted-foreground/10" />
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary shadow-[0_10px_24px_rgba(var(--primary-rgb),0.08)] dark:bg-primary/[0.12] dark:text-white"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground dark:hover:bg-primary/[0.06]",
                    ].join(" ")}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span className="absolute inset-y-1 left-1 w-[3px] rounded-full bg-primary dark:bg-accent" aria-hidden="true" />
                    )}
                    <div
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        active
                          ? "bg-primary/12 text-primary dark:bg-primary/[0.12] dark:text-white"
                          : "bg-secondary/65 text-muted-foreground group-hover:text-foreground dark:bg-primary/[0.05]",
                      ].join(" ")}
                    >
                      <item.Icon className="h-4 w-4" />
                    </div>
                    <span className={active ? "font-semibold tracking-wide" : "tracking-wide"}>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-subtle dark:bg-accent" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-5 border-t border-border dark:border-t-transparent pt-3">
        <div className="px-3 py-2 mb-1">
          <div className="mb-2 text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">外观</div>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={[
                    "rounded-xl px-2 py-2 text-[11px] font-medium transition-all duration-150",
                    active
                      ? "bg-primary/10 text-primary border border-primary/15 dark:border-transparent dark:bg-primary/[0.12] dark:text-white"
                      : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/60 dark:hover:bg-primary/[0.06]",
                  ].join(" ")}
                  aria-label={`切换到${opt.label}模式`}
                  aria-pressed={active}
                >
                  <opt.Icon className="mx-auto mb-1 h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <Link
          href="/settings"
          className={[
            "group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200",
            isActive("/settings")
              ? "bg-primary/10 text-primary shadow-[0_10px_24px_rgba(var(--primary-rgb),0.08)] dark:bg-primary/[0.12] dark:text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 dark:hover:bg-primary/[0.06]",
          ].join(" ")}
          aria-label="用户中心"
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/[0.14] dark:text-white">
            <User className="h-4 w-4" />
          </div>
          <span className={isActive("/settings") ? "font-semibold tracking-wide" : "tracking-wide"}>用户中心</span>
          {isActive("/settings") && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-subtle dark:bg-accent" aria-hidden="true" />}
        </Link>
      </div>
    </aside>
  );
}

export default SideNav;
