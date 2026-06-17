"use client";

import { Bot, CalendarDays, ClipboardList, Ellipsis, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CORE_ITEMS = [
  { href: "/", label: "首页", Icon: Home },
  { href: "/schedule", label: "课表", Icon: CalendarDays },
  { href: "/assignments", label: "作业", Icon: ClipboardList },
  { href: "/chat", label: "AI", Icon: Bot },
  { href: "/more", label: "更多", Icon: Ellipsis },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-90 ${
      active
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:bg-primary-container/40 active:bg-primary-container/50"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pt-2 pb-safe md:hidden bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-8px_24px_-4px_rgba(var(--ximi-glow),0.18)]"
      aria-label="底部导航"
    >
      {CORE_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={tabClass(active)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} />
            <span className="text-[11px] font-semibold leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
