"use client";

import {
  Activity, Bot, BookOpen, Brain, Calculator, CalendarDays, ClipboardList,
  Clock, Ellipsis, FileText, HeartPulse, LayoutDashboard, Library, Monitor,
  Newspaper, Settings, Sparkles, Target, Timer, TrendingUp, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const CORE_ITEMS = [
  { href: "/", label: "首页", Icon: LayoutDashboard },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/chat", label: "AI", Icon: Bot },
];

const MORE_GROUPS = [
  {
    label: "学业",
    items: [
      { href: "/exams", label: "考试", Icon: Clock },
      { href: "/goals", label: "目标", Icon: Target },
      { href: "/gpa", label: "绩点", Icon: Calculator },
      { href: "/progress", label: "学习进度", Icon: TrendingUp },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/running", label: "跑步", Icon: Activity },
      { href: "/pomodoro", label: "番茄钟", Icon: Timer },
      { href: "/activity", label: "屏幕时间", Icon: Monitor },
      { href: "/reports/daily", label: "日报", Icon: Newspaper },
    ],
  },
  {
    label: "知识",
    items: [
      { href: "/notes", label: "笔记", Icon: FileText },
      { href: "/library", label: "图书馆", Icon: Library },
      { href: "/knowledge", label: "知识画像", Icon: Brain },
      { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
    ],
  },
  {
    label: "更多",
    items: [
      { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
      { href: "/monitoring", label: "Agent", Icon: HeartPulse },
      { href: "/settings", label: "设置", Icon: Settings },
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
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border bg-background/95 pb-safe"
        aria-label="底部导航"
      >
        <div className="grid h-16 grid-cols-5 px-1">
          {CORE_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-lg transition-colors duration-150 ${
                  active ? "text-foreground" : "text-muted-foreground active:text-foreground"
                }`}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute inset-x-2 inset-y-2 rounded-lg bg-secondary" aria-hidden="true" />
                )}
                <item.Icon
                  className="relative z-[1] h-[19px] w-[19px] transition-colors"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`relative z-[1] text-[10px] leading-none ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 更多按钮 */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-lg transition-colors duration-150 ${
              drawerOpen ? "text-foreground" : "text-muted-foreground active:text-foreground"
            }`}
            aria-label="更多功能"
            aria-expanded={drawerOpen}
          >
            {drawerOpen && (
              <span className="absolute inset-x-2 inset-y-2 rounded-lg bg-secondary" aria-hidden="true" />
            )}
            <Ellipsis className="relative z-[1] h-[19px] w-[19px]" strokeWidth={1.8} />
            <span className="relative z-[1] text-[10px] leading-none">更多</span>
          </button>
        </div>
      </nav>

      {/* 更多抽屉 — Bottom Sheet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/25 animate-fade-in" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-xl shadow-lg max-h-[76vh] overflow-y-auto pb-safe animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="text-[15px] font-semibold font-display text-foreground">更多功能</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="px-3 pb-7 space-y-4">
              {MORE_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-semibold text-muted-foreground px-2 mb-1">{group.label}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-center transition-colors ${
                            active
                              ? "bg-secondary text-foreground"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <item.Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 1.8} />
                          <span className="text-[11px] font-medium leading-tight">{item.label}</span>
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
