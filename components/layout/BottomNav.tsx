"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BOTTOM_NAV_CORE } from "@/config/navigation";
import { cn } from "@/lib/utils";

// +1 for "更多" tab
const TOTAL_COLS = BOTTOM_NAV_CORE.length + 1;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-2xl pb-safe"
      aria-label="底部导航"
    >
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${TOTAL_COLS}, minmax(0, 1fr))` }}>
        {BOTTOM_NAV_CORE.map((item) => {
          const active = isActive(item.href);
          const label = item.shortLabel ?? item.label;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:rounded",
                active ? "text-primary" : "text-muted-foreground/75 active:text-muted-foreground"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary/25" aria-hidden="true" />
              )}
              <Icon className="relative z-[1] h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn("relative z-[1] text-xs leading-none", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* 更多 — 统一到 /more 页面 */}
        <Link
          href="/more"
          className={cn(
            "relative flex min-w-0 flex-col items-center justify-center gap-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:rounded",
            pathname === "/more" ? "text-primary" : "text-muted-foreground/75 active:text-muted-foreground"
          )}
          aria-label="更多功能"
          aria-current={pathname === "/more" ? "page" : undefined}
        >
          <Ellipsis className="relative z-[1] h-5 w-5" strokeWidth={1.8} />
          <span className="relative z-[1] text-xs leading-none">更多</span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNav;
