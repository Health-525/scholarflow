"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, ClipboardList, Activity, FileText, Library, Sparkles, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",              label: "主页",   Icon: LayoutDashboard },
  { href: "/schedule",      label: "课表",   Icon: CalendarDays },
  { href: "/assignments",   label: "作业",   Icon: ClipboardList },
  { href: "/running",       label: "跑步",   Icon: Activity },
  { href: "/notes",         label: "笔记",   Icon: FileText },
  { href: "/library",       label: "图书馆", Icon: Library },
  { href: "/wrinkle",       label: "肤测",   Icon: Sparkles },
  { href: "/settings",      label: "我的",   Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/90 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      aria-label="底部导航"
    >
      <div className="grid grid-cols-8 h-14">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative ${
                isActive ? "text-primary" : "text-muted-foreground/70 active:text-muted-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active glow */}
              {isActive && (
                <span
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary/30 animate-fade-in"
                  aria-hidden="true"
                />
              )}
              <item.Icon
                className={`w-[18px] h-[18px] leading-none transition-all duration-300 ${
                  isActive ? "scale-[1.15] drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.3)]" : "scale-1"
                }`}
                aria-hidden="true"
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={`text-[9px] leading-none tracking-wide transition-all duration-200 ${
                isActive ? "font-semibold" : ""
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;