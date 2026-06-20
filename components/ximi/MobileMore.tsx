"use client";

import {
  Activity, BarChart3, BookOpen, Brain, Bell, Calculator, Clock, Code,
  ChevronRight, FileText, HeartPulse, Info, Library, LogOut,
  Monitor, Newspaper, Palette, Pencil, Settings, Shirt, Sparkles, Store,
  Target, Timer, TrendingUp, User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Mascot } from "@/components/ximi/Mascot";
import { useAssignmentsQuery } from "@/hooks/useQueries";

const APP_VERSION = "v2.1.0";

/** 「全部功能」分组 — 由原底导抽屉的 MORE_GROUPS 迁移而来,保证去掉抽屉后链接不丢失。 */
const FEATURE_GROUPS = [
  {
    label: "学业",
    items: [
      { href: "/exams", label: "考试", Icon: Clock },
      { href: "/goals", label: "目标", Icon: Target },
      { href: "/gpa", label: "绩点", Icon: Calculator },
      { href: "/progress", label: "学习进度", Icon: TrendingUp },
    ],
  },
  {
    label: "工具",
    items: [
      { href: "/running", label: "跑步", Icon: Activity },
      { href: "/pomodoro", label: "番茄钟", Icon: Timer },
      { href: "/activity", label: "屏幕时间", Icon: Monitor },
      { href: "/reports/daily", label: "日报", Icon: Newspaper },
    ],
  },
  {
    label: "知识",
    items: [
      { href: "/notes", label: "笔记", Icon: FileText },
      { href: "/library", label: "图书馆", Icon: Library },
      { href: "/knowledge", label: "知识画像", Icon: Brain },
      { href: "/knowledge/roadmap", label: "学习路线", Icon: BookOpen },
    ],
  },
  {
    label: "其他",
    items: [
      { href: "/wrinkle", label: "皮肤检测", Icon: Sparkles },
      { href: "/monitoring", label: "Agent", Icon: HeartPulse },
      { href: "/settings", label: "设置", Icon: Settings },
    ],
  },
];

const SETTINGS_ROWS = [
  { href: "/settings", label: "账号与安全", Icon: User, tint: "bg-primary-container/30 text-primary" },
  { href: "/settings", label: "通知设置", Icon: Bell, tint: "bg-secondary-container/40 text-secondary" },
  { href: "/settings", label: "主题与外观", Icon: Palette, tint: "bg-tertiary-container/40 text-tertiary" },
];

function StatCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-3 text-center">
      <p className="mb-1 text-[12px] font-semibold text-on-surface-variant">{label}</p>
      <p className={`text-[22px] font-bold leading-tight ${tone}`}>{value}</p>
    </div>
  );
}

/**
 * 移动端萌系「更多 / 个人中心」— 高保真还原「小咪」mockup_4。
 * 个人资料 + 学习数据 + 小咪衣橱 + 账号设置 + 全部功能(迁移自原底导抽屉) + 关于。
 * 游戏化数值(LV / 连续打卡 / 专注力 / 金币 / 今日时长)为静态壳;完成任务接真实已完成作业数。
 * 仅移动端显示,桌面端走 app/more/page.tsx 的回退视图。
 */
export function MobileMore() {
  const { assignments } = useAssignmentsQuery();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const doneCount = mounted ? assignments.filter((a) => a.done).length : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pb-24 pt-3 md:hidden">
      {/* 标题 */}
      <div className="px-1">
        <h1 className="text-[24px] font-bold text-primary">个人中心</h1>
        <p className="text-[13px] text-on-surface-variant">和小咪一起,记录每一天的成长~</p>
      </div>

      {/* 个人资料卡 */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.3)] backdrop-blur-md">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-surface-container-lowest shadow-[0_12px_24px_-8px_rgba(var(--ximi-glow),0.4)]">
              <Mascot size="lg" float className="!drop-shadow-none" />
            </div>
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-container text-on-primary-container shadow-md">
              <Pencil className="h-3.5 w-3.5" />
            </span>
          </div>
          <h2 className="mt-3 text-[22px] font-bold text-on-surface">学霸小咪</h2>
          <p className="mt-1 text-[14px] text-on-surface-variant">
  &quot;坚持就是胜利，每天进步一点点！&quot;
</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-secondary-container/40 px-3 py-1 text-[12px] font-semibold text-on-secondary-container">
              LV.12 学习达人
            </span>
            <span className="rounded-full bg-tertiary-container/40 px-3 py-1 text-[12px] font-semibold text-on-tertiary-container">
              连续打卡 45 天
            </span>
          </div>
        </div>
      </section>

      {/* 学习数据 */}
      <section className="rounded-[28px] bg-surface-container-lowest p-5 shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.25)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[18px] font-bold text-on-surface">
            <BarChart3 className="h-5 w-5 text-primary" />
            学习数据
          </h3>
          <Link href="/progress" className="text-[13px] font-semibold text-primary active:opacity-70">
            查看详情
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCell label="今日时长" value="4.5h" tone="text-primary" />
          <StatCell label="完成任务" value={String(doneCount)} tone="text-secondary" />
          <StatCell label="专注力评分" value="A+" tone="text-tertiary" />
          <StatCell label="获得金币" value="150" tone="text-primary" />
        </div>
      </section>

      {/* 小咪衣橱 */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-fixed to-primary-container p-5 shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.3)]">
        <div className="pointer-events-none absolute -bottom-6 -right-4 opacity-20">
          <Mascot size="xl" className="!drop-shadow-none" />
        </div>
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="flex items-center gap-2 text-[18px] font-bold text-on-primary-container">
              <Store className="h-5 w-5" />
              小咪衣橱
            </h3>
            <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold text-on-primary-container backdrop-blur-sm">
              敬请期待
            </span>
          </div>
          <p className="mb-4 text-[14px] text-on-primary-container/80">为你的学习伴侣挑选新装扮!</p>
          <div className="flex gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-on-primary-container backdrop-blur-sm">
              <Shirt className="h-5 w-5" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-on-primary-container backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      {/* 账号设置 */}
      <section className="overflow-hidden rounded-[28px] bg-surface-container-lowest shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.25)]">
        <ul className="divide-y divide-outline-variant/40">
          {SETTINGS_ROWS.map((row) => (
            <li key={row.label}>
              <Link
                href={row.href}
                className="flex items-center justify-between p-4 transition-colors hover:bg-surface-container-low active:bg-surface-container-low"
              >
                <span className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${row.tint}`}>
                    <row.Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[15px] font-semibold text-on-surface">{row.label}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 全部功能 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[13px] font-bold text-on-surface-variant">全部功能</span>
        </div>
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-1 text-[12px] font-semibold text-on-surface-variant">{group.label}</div>
            <div className="grid grid-cols-3 gap-2.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[20px] bg-surface-container-lowest px-2 py-3 text-center text-on-surface shadow-[0_8px_20px_-12px_rgba(var(--ximi-glow),0.3)] transition-all hover:bg-surface-container-low active:scale-95"
                >
                  <item.Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.9} />
                  <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 关于我们 */}
      <section className="rounded-[28px] bg-surface-container-lowest p-5 shadow-[0_20px_40px_-20px_rgba(var(--ximi-glow),0.25)]">
        <h3 className="mb-2 flex items-center gap-2 text-[18px] font-bold text-on-surface">
          <Info className="h-5 w-5 text-primary" />
          关于我们
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-on-surface-variant">
          小咪学习助手 {APP_VERSION}
          <br />
          致力于打造最温暖的陪伴式学习环境。
        </p>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container py-3 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-variant active:scale-[0.98]"
        >
          <Code className="h-4 w-4" />
          开源仓库
        </button>
      </section>

      {/* 退出登录 */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full px-6 py-2 text-[14px] font-semibold text-error transition-colors hover:bg-error-container/25 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}

export default MobileMore;
