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
        "group flex items-center gap-3 px-3 py-2.5 min-h-10 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/[0.12] dark:text-primary"
          : wip
            ? "text-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ].join(" ")}
    >
      <Icon
        className={[
          "shrink-0 h-[18px] w-[18px] transition-colors duration-150",
          active
            ? "text-primary"
            : wip
              ? "text-muted-foreground/30"
              : "text-muted-foreground/60 group-hover:text-foreground",
        ].join(" ")}
      />
      <span className="flex-1">{label}</span>
      {wip && (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/60 shrink-0">
          开发中
        </span>
      )}
    </Link>
  );
}

export function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-[rgba(0,0,0,0.04)] bg-card/60 backdrop-blur-2xl dark:bg-sidebar/95 dark:border-white/[0.06]"
      aria-label="侧边导航"
    >
      {/* Brand — 拖拽区域 */}
      <div
        className="px-6 pt-6 pb-5"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Image
            src="/icons/logo.png"
            alt="ScholarFlow"
            width={32}
            height={32}
            className="rounded-xl shrink-0"
            style={{ objectFit: "cover" }}
          />
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-semibold text-primary tracking-tight">
              Scholar
            </span>
            <span className="font-display text-lg font-semibold text-foreground tracking-tight">
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
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div
        className="px-3 pb-4 border-t border-[rgba(0,0,0,0.04)] pt-3"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <NavItem item={SIDE_NAV_SETTINGS} />
      </div>
    </aside>
  );
}

export default SideNav;
