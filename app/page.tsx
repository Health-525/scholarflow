"use client";

import { useState, useEffect, useMemo } from "react";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { StatsDashboard } from "@/components/dashboard/StatsDashboard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { GPACard } from "@/components/dashboard/GPACard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";

function useGreeting() {
  const [greeting, setGreeting] = useState({ text: "你好", emoji: "👋", date: "", time: "" });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hour = now.getHours();
      const text =
        hour < 6  ? "夜深了" :
        hour < 9  ? "早安" :
        hour < 12 ? "上午好" :
        hour < 14 ? "午安" :
        hour < 18 ? "下午好" :
        hour < 22 ? "晚上好" : "夜深了";
      const emoji =
        hour < 6  ? "🌙" :
        hour < 9  ? "☀️" :
        hour < 12 ? "🌤️" :
        hour < 14 ? "🍃" :
        hour < 18 ? "🌤️" :
        hour < 22 ? "🌙" : "🌙";
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
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  return greeting;
}

export default function DashboardPage() {
  const { text: greeting, emoji: greetingEmoji, date: dateStr, time: timeStr } = useGreeting();

  return (
    <div className="max-w-5xl mx-auto py-6 pb-24 md:pb-8 animate-page">

      {/* ── Hero Header ── */}
      <header className="mb-5 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                {timeStr}
              </span>
            </div>
            <h1 className="text-[24px] font-bold leading-tight font-display text-foreground tracking-tight">
              {greeting}
            </h1>
            <p className="text-[13px] mt-1 text-muted-foreground">
              {dateStr}
            </p>
          </div>
          <div className="text-3xl leading-none shrink-0 animate-breathe" aria-hidden="true">
            {greetingEmoji}
          </div>
        </div>
        {/* Decorative gradient line */}
        <div className="mt-4 h-[2px] rounded-full bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
      </header>

      {/* ── Summary Stats ── */}
      <div className="animate-fade-up stagger-1">
        <SummaryBanner />
      </div>

      {/* ── Bento Grid: Primary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="animate-fade-up stagger-2">
          <ScheduleCard />
        </div>
        <div className="animate-fade-up stagger-3">
          <AssignmentsCard />
        </div>
      </div>

      {/* ── Bento Grid: Secondary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="animate-fade-up stagger-4">
          <GPACard />
        </div>
        <div className="animate-fade-up stagger-5">
          <RunningCard />
        </div>
        <div className="animate-fade-up stagger-6">
          <ExamCountdownCard />
        </div>
      </div>

      {/* ── Bento Grid: Tertiary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="animate-fade-up stagger-7">
          <RecentDailyCard />
        </div>
        <div className="animate-fade-up stagger-8">
          <ScreenTimeCard />
        </div>
      </div>

      {/* ── Data Visualization ── */}
      <div className="animate-fade-up stagger-8 mb-4">
        <StatsDashboard />
      </div>

      {/* ── News ── */}
      <div className="animate-fade-up stagger-8">
        <JwcNewsCard />
      </div>
    </div>
  );
}