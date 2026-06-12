"use client";

import { useEffect, useState } from "react";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";

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
    <div className="max-w-5xl mx-auto py-5 pb-24 md:pb-10 space-y-4 animate-page">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[28px] px-6 py-5 animate-fade-up">
        <div className="pointer-events-none absolute inset-0 hidden dark:block" aria-hidden="true">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1" suppressHydrationWarning>
            <span className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70">
              {dateStr}
            </span>
            <h1 className="text-[28px] font-bold leading-tight font-display text-foreground tracking-tight">
              {greeting}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              新的一天，从计划开始
            </p>
          </div>

          <div className="relative shrink-0" suppressHydrationWarning>
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl dark:bg-primary/12" aria-hidden="true" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-card/75 text-[34px] backdrop-blur-xl shadow-sm dark:bg-[#1a1a20]/60">
              {greetingEmoji}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="animate-fade-up stagger-1">
        <SummaryBanner />
      </div>

      {/* 今日焦点 */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">今日焦点</span>
        </div>
        <div className="animate-fade-up stagger-2">
          <ScheduleCard />
        </div>
      </div>

      {/* 任务与健康 */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">任务与健康</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-fade-up stagger-3">
            <AssignmentsCard />
          </div>
          <div className="animate-fade-up stagger-4">
            <RunningCard />
          </div>
        </div>
      </div>

      {/* 数据追踪 */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">数据追踪</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-fade-up stagger-5">
            <ScreenTimeCard />
          </div>
          <div className="animate-fade-up stagger-6">
            <ExamCountdownCard />
          </div>
          <div className="animate-fade-up stagger-7">
            <RecentDailyCard />
          </div>
        </div>
      </div>

      {/* 信息浏览 */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">信息浏览</span>
        </div>
        <div className="animate-fade-up stagger-8">
          <JwcNewsCard />
        </div>
      </div>
    </div>
  );
}
