"use client";

import { Settings } from "lucide-react";
import Link from "next/link";

/**
 * 移动端「小咪」顶栏 — 全局品牌条(对齐 mockup 的 TopAppBar)。
 * 仅移动端显示;桌面用 SideNav,故 md:hidden。
 */
export function CuteTopBar() {
  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 pb-2.5 bg-surface/80 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(var(--ximi-glow),0.12)]"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
    >
      <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-surface-container shadow-sm">
          {/* Material Symbols「pets」爪印 —— 对齐参考图(Image5)的形状:4 圆豆 + 掌垫 */}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-8 w-8 rotate-12 text-primary">
            <circle cx="4.5" cy="9.5" r="2.5" />
            <circle cx="9" cy="5.5" r="2.5" />
            <circle cx="15" cy="5.5" r="2.5" />
            <circle cx="19.5" cy="9.5" r="2.5" />
            <path d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.79.05c-.11.02-.22.05-.33.09-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8z" />
          </svg>
        </span>
        <h1 className="text-[22px] font-bold tracking-tight text-primary">小咪学习助手</h1>
      </Link>
      <Link
        href="/settings"
        aria-label="设置"
        className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant active:scale-95 transition"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}

export default CuteTopBar;
