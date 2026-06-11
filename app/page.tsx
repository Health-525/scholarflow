"use client";

import { useEffect, useState } from "react";
import { AIChatCard } from "@/components/dashboard/AIChatCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { GPACard } from "@/components/dashboard/GPACard";
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
    time: "",
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

      const time = now.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setGreeting({ text, emoji, date, time });
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}

export default function DashboardPage() {
  const { text: greeting, emoji: greetingEmoji, date: dateStr, time: timeStr } = useGreeting();

  return (
    <div className="max-w-5xl mx-auto py-6 pb-24 md:pb-8 animate-page">
      <header className="relative mb-5 overflow-hidden rounded-[28px] px-5 py-5 animate-fade-up dark:dark-panel">
        <div className="pointer-events-none absolute inset-0 hidden dark:block" aria-hidden="true">
          <div className="absolute -left-10 top-0 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/60 bg-secondary/80 px-2.5 py-1 text-[10px] font-medium tabular-nums text-muted-foreground dark:border-transparent dark:bg-primary/[0.06] dark:text-white/75">
                {timeStr}
              </span>
              <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground/70">
                {dateStr}
              </span>
            </div>

            <h1 className="text-[28px] font-bold leading-tight font-display text-foreground tracking-tight">
              {greeting}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              今天的学习、课表和任务都在这里。
            </p>
          </div>

          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl dark:bg-primary/12" aria-hidden="true" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-card/75 text-[34px] backdrop-blur-xl dark:bg-primary/[0.06]">
              {greetingEmoji}
            </div>
          </div>
        </div>

        <div className="relative mt-5 h-px rounded-full bg-gradient-to-r from-primary/45 via-primary/15 to-transparent" />
      </header>

      <div className="animate-fade-up stagger-1">
        <SummaryBanner />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="md:col-span-2 animate-fade-up stagger-2">
          <ScheduleCard />
        </div>
        <div className="animate-fade-up stagger-3">
          <AIChatCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className="md:col-span-2 animate-fade-up stagger-4">
          <AssignmentsCard />
        </div>
        <div className="animate-fade-up stagger-5">
          <GPACard />
        </div>
        <div className="animate-fade-up stagger-6">
          <ExamCountdownCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="animate-fade-up stagger-7">
          <RunningCard />
        </div>
        <div className="animate-fade-up stagger-8">
          <ScreenTimeCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="animate-fade-up stagger-9">
          <RecentDailyCard />
        </div>
        <div className="animate-fade-up stagger-10">
          <JwcNewsCard />
        </div>
      </div>
    </div>
  );
}
