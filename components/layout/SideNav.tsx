"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Activity, Target,
  FileText, Newspaper, Monitor, Calculator, Clock, HeartPulse, Brain, BookOpen, Library, Timer, User,
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
      className="hidden md:flex flex-col w-52 shrink-0 h-screen sticky top-0"
      style={{
        background: "var(--surface-elevated)",
        borderRight: "1px solid var(--border-subtle)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
      }}
      aria-label="侧边导航"
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/logo.png"
            alt="ScholarFlow logo"
            width={32}
            height={32}
            className="rounded-lg shrink-0"
            style={{ objectFit: "cover" }}
          />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-display text-lg"
                style={{ color: "var(--accent)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
              >
                Scholar
              </span>
              <span
                className="font-display text-lg"
                style={{ color: "var(--text-primary)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
              >
                Flow
              </span>
            </div>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              学习管理中枢
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 mb-4 flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <div className="w-1 h-1 rounded-full" style={{ background: "var(--accent-soft)" }} />
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
              style={active ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--text-secondary)" }}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className="shrink-0 w-1 h-5 rounded-full transition-all duration-150"
                style={{ background: active ? "var(--accent)" : "transparent" }}
                aria-hidden="true"
              />
              <item.Icon
                className="shrink-0 w-4 h-4 transition-colors duration-150"
                style={{ color: active ? "var(--accent)" : "var(--text-tertiary)" }}
              />
              <span className="tracking-wide">{item.label}</span>
              {!active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "var(--text-tertiary)" }}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Theme + User Center ── */}
      <div
        className="px-3 pb-5"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}
      >
        {/* Theme quick toggle */}
        <div className="px-3 py-2 mb-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>
              外观
            </span>
          </div>
          <div className="flex gap-1">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                style={{
                  background: theme === opt.value ? "var(--accent-soft)" : "transparent",
                  color: theme === opt.value ? "var(--accent)" : "var(--text-tertiary)",
                  border: theme === opt.value ? "1px solid var(--accent-soft)" : "1px solid transparent",
                }}
                aria-label={`切换到${opt.label}模式`}
                aria-pressed={theme === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* User center link */}
        <Link
          href="/settings"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
          style={{
            color: isActive("/settings") ? "var(--accent)" : "var(--text-secondary)",
            background: isActive("/settings") ? "var(--accent-soft)" : "transparent",
          }}
          aria-label="用户中心"
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <span
            className="shrink-0 w-1 h-5 rounded-full transition-all duration-150"
            style={{ background: isActive("/settings") ? "var(--accent)" : "transparent" }}
            aria-hidden="true"
          />
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <User className="w-3 h-3" style={{ color: "var(--accent)" }} />
          </div>
          <span className="tracking-wide">用户中心</span>
          {!isActive("/settings") && (
            <span
              className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--text-tertiary)" }}
              aria-hidden="true"
            />
          )}
        </Link>
      </div>
    </aside>
  );
}

export default SideNav;
