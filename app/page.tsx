"use client";

import { useEffect, useState } from "react";

import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";
import { MobileHome } from "@/components/ximi/MobileHome";

function useGreeting() {
  const [greeting, setGreeting] = useState({
    text: "你好",
    emoji: "👋",
    date: "",
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hour = now.getHours();

      const text =
        hour < 6 ? "夜深了" :
        hour < 9 ? "早安" :
        hour < 12 ? "上午好" :
        hour < 14 ? "中午好" :
        hour < 18 ? "下午好" :
        hour < 22 ? "晚上好" : "夜深了";

      const emoji =
        hour < 6 ? "🌙" :
        hour < 9 ? "☀️" :
        hour < 12 ? "🌤️" :
        hour < 14 ? "🍜" :
        hour < 18 ? "⚡" :
        hour < 22 ? "🌃" : "🌙";

      const date = now.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      setGreeting({ text, emoji, date });
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}

export default function DashboardPage() {
  const { text: greeting, emoji: greetingEmoji, date: dateStr } = useGreeting();

  return (
    <>
      {/* 移动端:萌系「小咪」首页 */}
      <MobileHome />

      {/* 桌面端:原版仪表盘(保持不变) */}
      <div className="hidden md:block mx-auto max-w-5xl py-5 pb-32 md:py-8 md:pb-12 space-y-4 md:space-y-5 animate-page">
      <header className="animate-fade-up">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4 md:pb-5">
          <div className="min-w-0 flex-1" suppressHydrationWarning>
            <span className="text-[12px] font-medium text-muted-foreground">
              {dateStr}
            </span>
            <h1 className="mt-1.5 text-[24px] font-semibold leading-tight font-display text-foreground md:mt-2 md:text-2xl">
              {greeting}，今天处理什么？
            </h1>
          </div>
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-lg md:flex" suppressHydrationWarning>
            {greetingEmoji}
          </div>
        </div>
      </header>

      <div className="animate-fade-up stagger-1">
        <QuickActions />
      </div>

      <section className="space-y-4 md:space-y-5 animate-fade-up stagger-2">
        <div className="space-y-2">
          <span className="block text-[12px] font-medium text-muted-foreground px-1">
            概览
          </span>
          <SummaryBanner />
        </div>

        <div className="space-y-2">
          <span className="block text-[12px] font-medium text-muted-foreground px-1">
            今日焦点
          </span>
          <ScheduleCard />
        </div>

        <div className="space-y-2">
          <span className="block text-[12px] font-medium text-muted-foreground px-1">
            任务与健康
          </span>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <AssignmentsCard />
            <RunningCard />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[12px] font-medium text-muted-foreground px-1">
            数据追踪
          </span>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <ScreenTimeCard />
            <ExamCountdownCard />
            <RecentDailyCard />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[12px] font-medium text-muted-foreground px-1">
            信息浏览
          </span>
          <JwcNewsCard />
        </div>
      </section>
      </div>
    </>
  );
}
