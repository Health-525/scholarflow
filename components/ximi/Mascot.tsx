"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZE_PX = { xs: 32, sm: 44, md: 64, lg: 96, xl: 132 } as const;

type MascotSize = keyof typeof SIZE_PX;

/**
 * 小咪吉祥物 — 萌系皮肤的主角形象。
 * 用原生 <img> 而非 next/image,规避 Electron / 静态导出下的图片优化坑。
 * 当 public/mascot/ximi.png 缺失时,自动回退到 emoji 占位;放入真实 PNG 后即生效。
 */
export function Mascot({
  size = "md",
  float = false,
  eager = false,
  className,
  alt = "小咪",
}: {
  size?: MascotSize;
  float?: boolean;
  /** 首屏可见时设 true,提前加载 */
  eager?: boolean;
  className?: string;
  alt?: string;
}) {
  const px = SIZE_PX[size];
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        style={{ width: px, height: px, fontSize: Math.round(px * 0.6) }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container",
          float && "ximi-float",
          className,
        )}
      >
        🐱
      </span>
    );
  }

  return (
    <img
      src="/mascot/ximi.png"
      alt={alt}
      width={px}
      height={px}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "inline-block shrink-0 select-none object-contain drop-shadow-[0_8px_16px_rgba(var(--ximi-glow),0.35)]",
        float && "ximi-float",
        className,
      )}
    />
  );
}
