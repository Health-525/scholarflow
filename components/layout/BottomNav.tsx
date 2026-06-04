"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",              label: "主页",   icon: "◉" },
  { href: "/schedule",      label: "课表",   icon: "⊞" },
  { href: "/assignments",   label: "作业",   icon: "◳" },
  { href: "/notes",         label: "笔记",   icon: "◫" },
  { href: "/reports/daily", label: "日报",   icon: "◨" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
      style={{
        background: "var(--surface-glass)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="底部导航"
    >
      <div className="flex h-14">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 relative"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active top indicator */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                  aria-hidden="true"
                />
              )}
              <span
                className="text-base font-mono leading-none transition-transform duration-150"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] font-medium leading-none tracking-wide"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
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
