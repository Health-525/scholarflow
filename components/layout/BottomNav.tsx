"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Bot, BookOpen, Brain, Calculator, CalendarDays, ClipboardList,
  Clock, Ellipsis, FileText, HeartPulse, LayoutDashboard, Library, Monitor,
  Newspaper, Sparkles, Target, Timer, TrendingUp, X,
} from "lucide-react";

const CORE_ITEMS = [
  { href: "/", label: "首页", Icon: LayoutDashboard },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/running", label: "跑步", Icon: Activity },
  { href: "/notes", label: "笔记", Icon: FileText },
  { href: "/library", label: "图书馆", Icon: Library },
  { href: "/chat", label: "AI", Icon: Bot },
];

const MORE_GROUPS = [
  {
    label: "学业",
    items: [
      { href: "/exams", label: "考试", Icon: Clock },
      { href: "/goals", label: "目标", Icon: Target },
      { href: "/gpa", label: "绩点", Icon: Calculator },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/pomodoro", label: "番茄钟", Icon: Timer },
      { href: "/activity", label: "屏幕时间", Icon: Monitor },
      { href: "/reports/daily", label: "日报", Icon: Newspaper },
    ],
  },
  {
    label: "知识",
    items: [
      { href: "/knowledge", label: "知识画像", Icon: Brain },
      { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
      { href: "/progress", label: "学习进度", Icon: TrendingUp },
    ],
  },
  {
    label: "更多",
    items: [
      { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
      { href: "/monitoring", label: "Agent", Icon: HeartPulse },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-2xl pb-safe dark:dark-panel dark:rounded-t-[24px] dark:mx-2 dark:mb-2"
        aria-label="底部导航"
      >
        <div className="grid grid-cols-8 h-16">
          {CORE_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  active ? "text-primary dark:text-white" : "text-muted-foreground/75 active:text-muted-foreground"
                }`}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <>
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-7 rounded-full bg-primary/25 dark:bg-accent/35" aria-hidden="true" />
                    <span className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/[0.06] dark:bg-primary/[0.06]" aria-hidden="true" />
                  </>
                )}
                <item.Icon
                  className={`relative z-[1] h-[18px] w-[18px] transition-all duration-300 ${
                    active ? "scale-[1.15] drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.28)]" : ""
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={`relative z-[1] text-[9px] leading-none tracking-wide ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 更多按钮 */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              drawerOpen ? "text-primary dark:text-white" : "text-muted-foreground/75 active:text-muted-foreground"
            }`}
            aria-label="更多功能"
            aria-expanded={drawerOpen}
          >
            <Ellipsis className="relative z-[1] h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="relative z-[1] text-[9px] leading-none tracking-wide">更多</span>
          </button>
        </div>
      </nav>

      {/* 更多抽屉 — Bottom Sheet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-[24px] shadow-lg max-h-[65vh] overflow-y-auto pb-safe animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="text-[15px] font-semibold font-display text-foreground">更多功能</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary text-muted-foreground"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="px-3 pb-6 space-y-4">
              {MORE_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-semibold text-muted-foreground px-2 mb-1">{group.label}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-colors ${
                            active
                              ? "bg-primary/10 text-primary dark:text-white"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <item.Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                          <span className="text-[11px] font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;
