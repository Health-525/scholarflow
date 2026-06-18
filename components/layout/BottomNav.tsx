"use client";

import { Ellipsis, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BOTTOM_NAV_CORE, BOTTOM_NAV_MORE_GROUPS } from "@/config/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    // 关闭后将焦点归还触发按钮
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    // 打开时将焦点移入抽屉的关闭按钮
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, handleClose]);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-2xl pb-safe dark:dark-panel dark:rounded-t-[24px] dark:mx-2 dark:mb-2"
        aria-label="底部导航"
      >
        <div className="grid grid-cols-8 h-16">
          {BOTTOM_NAV_CORE.map((item) => {
            const active = isActive(item.href);
            const label = item.shortLabel ?? item.label;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground/75 active:text-muted-foreground"
                }`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <>
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-7 rounded-full bg-primary/25 dark:bg-accent/35" aria-hidden="true" />
                    <span className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/[0.06] dark:bg-primary/[0.06]" aria-hidden="true" />
                  </>
                )}
                <Icon
                  className={`relative z-[1] h-5 w-5 transition-all duration-300 ${
                    active ? "scale-[1.15] drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.28)]" : ""
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={`relative z-[1] text-[11px] leading-none tracking-wide ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* 更多按钮 */}
          <button
            ref={triggerRef}
            onClick={() => setDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              drawerOpen ? "text-primary" : "text-muted-foreground/75 active:text-muted-foreground"
            }`}
            aria-label="更多功能"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <Ellipsis className="relative z-[1] h-5 w-5" strokeWidth={1.8} />
            <span className="relative z-[1] text-[11px] leading-none tracking-wide">更多</span>
          </button>
        </div>
      </nav>

      {/* 更多抽屉 — Bottom Sheet */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="button"
          tabIndex={-1}
          aria-label="关闭更多功能"
          onClick={handleClose}
          onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
        >
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" />
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-[24px] shadow-lg max-h-[65vh] overflow-y-auto pb-safe animate-fade-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-nav-more-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                handleClose();
              }
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-secondary" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h3 id="bottom-nav-more-title" className="text-[15px] font-semibold font-display text-foreground">更多功能</h3>
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary text-muted-foreground"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="px-3 pb-6 space-y-4">
              {BOTTOM_NAV_MORE_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-semibold text-muted-foreground px-2 mb-1">{group.label}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleClose}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                          <span className="text-[11px] font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;
