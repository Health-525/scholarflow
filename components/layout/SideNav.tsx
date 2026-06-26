"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SIDE_NAV_GROUPS,
  SIDE_NAV_SETTINGS,
  type NavItemConfig,
} from "@/config/navigation";

function NavItem({ item }: { item: NavItemConfig }) {
  const { href, label, icon: Icon, wip } = item;
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex items-center gap-2.5 px-3 py-1.5 min-h-8 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        active
          ? "bg-white/70 text-foreground shadow-sm"
          : wip
            ? "text-muted-foreground/50 hover:bg-white/40 hover:text-muted-foreground"
            : "text-foreground/80 hover:bg-white/50 hover:text-foreground",
      ].join(" ")}
    >
      <Icon
        strokeWidth={active ? 2 : 1.75}
        className={[
          "shrink-0 h-4 w-4 transition-colors duration-150",
          active
            ? "text-primary"
            : wip
              ? "text-muted-foreground/35"
              : "text-muted-foreground/70 group-hover:text-foreground",
        ].join(" ")}
      />
      <span className="flex-1">{label}</span>
      {wip && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/60 shrink-0">
          开发中
        </span>
      )}
    </Link>
  );
}

export function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col w-48 shrink-0 h-screen sticky top-0 bg-sidebar"
      aria-label="侧边导航"
    >
      {/* Brand — 拖拽区域 */}
      <div
        className="px-4 pt-5 pb-3"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Image
            src="/icons/logo.png"
            alt="ScholarFlow"
            width={28}
            height={28}
            className="rounded-lg shrink-0"
            style={{ objectFit: "cover" }}
          />
          <div className="flex items-baseline gap-1">
            <span className="font-display text-base font-semibold text-primary tracking-tight">
              Scholar
            </span>
            <span className="font-display text-base font-semibold text-foreground tracking-tight">
              Flow
            </span>
          </div>
        </div>
      </div>

      {/* Grouped navigation */}
      <nav
        className="flex-1 px-3 overflow-y-auto scrollbar-thin"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        role="navigation"
      >
        {SIDE_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/55">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div
        className="px-3 pb-3 pt-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <NavItem item={SIDE_NAV_SETTINGS} />
      </div>
    </aside>
  );
}

export default SideNav;
