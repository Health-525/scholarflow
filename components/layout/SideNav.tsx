"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",                label: "仪表板", icon: "◉" },
  { href: "/schedule",        label: "课表",   icon: "⊞" },
  { href: "/assignments",     label: "作业",   icon: "◳" },
  { href: "/running",         label: "跑步",   icon: "◎" },
  { href: "/notes",           label: "笔记",   icon: "◫" },
  { href: "/reports/daily",   label: "日报",   icon: "◨" },
];

export function SideNav() {
  const pathname = usePathname();

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
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-xl"
            style={{ color: "var(--accent)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
          >
            Scholar
          </span>
          <span
            className="font-display text-xl"
            style={{ color: "var(--text-primary)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
          >
            Flow
          </span>
        </div>
        <p className="text-[11px] mt-1 tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          学习管理中枢
        </p>
      </div>

      {/* Divider with decoration */}
      <div className="mx-6 mb-4 flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <div className="w-1 h-1 rounded-full" style={{ background: "var(--accent-soft)" }} />
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5" aria-label="主导航">
        {NAV_ITEMS.map((item, i) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
              style={
                isActive
                  ? {
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }
                  : {
                      color: "var(--text-secondary)",
                    }
              }
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator bar */}
              <span
                className="shrink-0 w-1 h-5 rounded-full transition-all duration-150"
                style={{
                  background: isActive ? "var(--accent)" : "transparent",
                }}
                aria-hidden="true"
              />
              <span
                className="shrink-0 text-sm font-mono transition-colors duration-150"
                style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
              {/* Hover accent dot */}
              {!isActive && (
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

      {/* Settings */}
      <div className="px-3 pb-5" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
          style={{
            color: pathname === "/settings" ? "var(--accent)" : "var(--text-tertiary)",
            background: pathname === "/settings" ? "var(--accent-soft)" : "transparent",
          }}
          aria-label="设置"
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <span className="shrink-0 w-1 h-5 rounded-full" style={{ background: pathname === "/settings" ? "var(--accent)" : "transparent" }} aria-hidden="true" />
          <span className="shrink-0 text-sm font-mono" style={{ color: pathname === "/settings" ? "var(--accent)" : "var(--text-muted)" }} aria-hidden="true">⊛</span>
          <span className="tracking-wide">设置</span>
        </Link>
      </div>
    </aside>
  );
}

export default SideNav;
