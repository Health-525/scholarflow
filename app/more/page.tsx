import { ChevronRight, Settings } from "lucide-react";
import Link from "next/link";

import { MobileMore } from "@/components/ximi/MobileMore";

export default function MorePage() {
  return (
    <>
      {/* 移动端:萌系「小咪」个人中心 */}
      <MobileMore />

      {/* 桌面端:简洁个人中心回退视图 */}
      <div className="hidden md:flex max-w-5xl mx-auto min-h-[60vh] items-center justify-center px-4 py-10 animate-page">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm animate-fade-up">
          <h1 className="text-xl font-bold font-display text-foreground">个人中心</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            账号、通知、主题与外观等设置都在这里管理。
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Settings className="h-4 w-4" />
            前往设置
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
