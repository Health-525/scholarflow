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

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{
        backgroundColor: "var(--surface-elevated)",
        borderRight: "0.5px solid var(--border)",
        backdropFilter: "blur(20px) saturate(180%)",
      }}
      aria-label="侧边导航"
    >
      {/* App name */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          ScholarFlow
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          学习管理中枢
        </p>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-3 space-y-1" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: "rgba(37, 99, 235, 0.12)",
                      color: "var(--accent)",
                    }
                  : {
                      color: "var(--text-secondary)",
                    }
              }
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-[18px]" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-3" style={{ borderTop: "0.5px solid var(--border)" }}>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            color: pathname === "/settings" ? "var(--accent)" : "var(--text-secondary)",
            backgroundColor:
              pathname === "/settings" ? "rgba(37, 99, 235, 0.12)" : "transparent",
          }}
          aria-label="设置"
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <span className="text-[18px]" aria-hidden="true">
            ⚙️
          </span>
          <span>设置</span>
        </Link>
      </div>
    </aside>
  );
}

export default SideNav;
