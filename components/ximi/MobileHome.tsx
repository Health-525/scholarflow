"use client";

import { BatteryCharging, Clock, Plus, Smile, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";
import { Mascot } from "@/components/ximi/Mascot";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";

const CHIP = [
  "bg-tertiary-container/50 text-on-tertiary-container",
  "bg-secondary-container/60 text-on-secondary-container",
  "bg-primary-container/50 text-on-primary-container",
];

function chipClass(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CHIP[h % CHIP.length];
}

function useGreetingText() {
  const [g, setG] = useState("你好");
  useEffect(() => {
    const h = new Date().getHours();
    setG(
      h < 6 ? "夜深了" : h < 9 ? "早安" : h < 12 ? "上午好" :
      h < 14 ? "中午好" : h < 18 ? "下午好" : h < 22 ? "晚上好" : "夜深了",
    );
  }, []);
  return g;
}

function TodayTasks() {
  const { assignments, isLoading, error, reload } = useAssignmentsQuery();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const pending = assignments.filter((a) => !a.done).slice(0, 4);

  return (
    <section className="relative w-full overflow-hidden rounded-[32px] bg-surface-container-lowest p-5 shadow-[0_20px_40px_-20px_rgba(255,183,206,0.25)]">
      <div className="pointer-events-none absolute inset-0 rounded-[32px] border-[1.5px] border-white/60" />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-on-surface">今日任务</h2>
        <Link
          href="/assignments"
          aria-label="查看作业"
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition hover:bg-primary-container/25 active:scale-90"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {(!mounted || isLoading) && [1, 2].map((i) => <div key={i} className="skeleton h-[68px] rounded-3xl" />)}

        {mounted && error && !isLoading && (
          <button onClick={reload} className="rounded-3xl bg-surface px-4 py-5 text-[14px] text-on-surface-variant">
            加载失败,点击重试
          </button>
        )}

        {mounted && !isLoading && !error && pending.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Mascot size="md" />
            <p className="text-[14px] text-on-surface-variant">今天没有作业啦，和小咪一起放松吧~</p>
          </div>
        )}

        {mounted && !isLoading && !error && pending.map((a) => {
          const urgency = classifyUrgency(a.deadline, new Date());
          const diff = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
          const danger = urgency === "overdue" || urgency === "urgent";
          const when =
            urgency === "overdue" ? "已逾期" :
            diff <= 0 ? "今天截止" : diff === 1 ? "明天截止" : `${diff} 天后`;
          return (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-3xl border border-transparent bg-surface p-3.5 transition-colors hover:border-outline-variant/40"
            >
              <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-outline" />
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 truncate text-[15px] font-semibold text-on-surface">{a.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${chipClass(a.subject || "")}`}>
                    {a.subject || "作业"}
                  </span>
                  <span className={`flex items-center gap-1 text-[12px] font-semibold ${danger ? "text-error" : "text-on-surface-variant"}`}>
                    <Clock className="h-3.5 w-3.5" /> {when}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 移动端萌系首页 — 高保真还原「小咪」mockup(英雄区 + 开始专注 + 今日任务),
 * 下方复用既有看板卡片(主题自动萌化)。仅移动端显示,桌面保持原版。
 */
export function MobileHome() {
  const greeting = useGreetingText();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-7 pb-4 pt-4 md:hidden">
      {/* Hero：小咪 */}
      <section className="relative flex flex-col items-center">
        <div className="absolute left-1/2 top-10 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-primary-container/30 blur-[42px]" />
        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(255,183,206,0.4)]">
          <Mascot size="xl" eager float className="!drop-shadow-none" />
        </div>
        <div className="z-10 -mt-5 flex gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-4 py-1.5 shadow-[0_8px_16px_-4px_rgba(255,183,206,0.25)] backdrop-blur-md">
            <Smile className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-semibold text-on-surface">元气满满</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-4 py-1.5 shadow-[0_8px_16px_-4px_rgba(255,183,206,0.25)] backdrop-blur-md">
            <BatteryCharging className="h-4 w-4 text-secondary" />
            <span className="text-[12px] font-semibold text-on-surface">准备学习</span>
          </span>
        </div>
        <p className="mt-4 text-center text-[15px] font-semibold text-on-surface">{greeting}，今天也要加油哦~</p>
      </section>

      {/* 开始专注 */}
      <Link
        href="/pomodoro"
        className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-primary-container py-4 text-on-primary-container shadow-[0_12px_24px_-8px_rgba(255,183,206,0.5)] transition-transform active:scale-[0.98]"
      >
        <Timer className="h-7 w-7" />
        <span className="text-[18px] font-bold">开始专注</span>
      </Link>

      {/* 今日任务 */}
      <TodayTasks />

      {/* 今日看板：复用既有卡片,主题自动萌化 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[13px] font-bold text-on-surface-variant">今日看板</span>
        </div>
        <ScheduleCard />
        <SummaryBanner />
        <RunningCard />
        <ScreenTimeCard />
        <ExamCountdownCard />
        <RecentDailyCard />
        <JwcNewsCard />
      </div>
    </div>
  );
}

export default MobileHome;
