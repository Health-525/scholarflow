"use client";

import { Settings } from "lucide-react";
import Link from "next/link";

import { Mascot } from "@/components/ximi/Mascot";

/**
 * 移动端「小咪」顶栏 — 全局品牌条(对齐 mockup 的 TopAppBar)。
 * 仅移动端显示;桌面用 SideNav,故 md:hidden。
 */
export function CuteTopBar() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-surface/80 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(255,183,206,0.12)]">
      <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-surface-container shadow-sm">
          <Mascot size="xs" eager className="!drop-shadow-none" />
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
