"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, CalendarDays, ClipboardList, FileText, LayoutDashboard, Library, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "首页", Icon: LayoutDashboard },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/running", label: "跑步", Icon: Activity },
  { href: "/notes", label: "笔记", Icon: FileText },
  { href: "/library", label: "图书馆", Icon: Library },
  { href: "/chat", label: "AI", Icon: Bot },
  { href: "/settings", label: "我的", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-2xl pb-safe dark:dark-panel dark:rounded-t-[24px] dark:mx-2 dark:mb-2 dark:border-transparent"
      aria-label="底部导航"
    >
      <div className="grid grid-cols-8 h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive ? "text-primary dark:text-white" : "text-muted-foreground/75 active:text-muted-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <>
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-7 rounded-full bg-primary/25 dark:bg-accent/35" aria-hidden="true" />
                  <span className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/[0.06] dark:bg-primary/[0.06]" aria-hidden="true" />
                </>
              )}
              <item.Icon
                className={`relative z-[1] h-[18px] w-[18px] transition-all duration-300 ${
                  isActive ? "scale-[1.15] drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.28)]" : ""
                }`}
                aria-hidden="true"
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span className={`relative z-[1] text-[9px] leading-none tracking-wide ${isActive ? "font-semibold" : ""}`}>
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
