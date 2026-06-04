"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "仪表板", icon: "🏠" },
  { href: "/schedule", label: "课表", icon: "📅" },
  { href: "/assignments", label: "作业", icon: "📝" },
  { href: "/running", label: "跑步", icon: "🏃" },
  { href: "/reports/daily", label: "日报", icon: "📖" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
      style={{
        backgroundColor: "var(--surface-elevated)",
        borderTop: "0.5px solid var(--border)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="底部导航"
    >
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-tertiary)",
              }}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-[20px] leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <span className="leading-none font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
