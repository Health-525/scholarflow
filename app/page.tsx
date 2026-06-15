"use client";

import { useEffect, useState } from "react";

import { QuickActions } from "@/components/dashboard/QuickActions";
import { SortableDashboard } from "@/components/dashboard/SortableDashboard";

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
    <div className="max-w-[1280px] mx-auto py-5 pb-24 md:pb-10 space-y-6 animate-page">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[28px] px-6 py-6 bg-gradient-to-br from-[#EEF2FF] to-[#F8F5FF] dark:from-primary/[0.08] dark:to-primary/[0.03] animate-fade-up">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-24 w-24 rounded-full bg-primary/4 blur-2xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1" suppressHydrationWarning>
            <span className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70">
              {dateStr}
            </span>
            <h1 className="text-[32px] font-bold leading-tight font-display text-foreground tracking-tight">
              {greeting}
            </h1>
            <p className="text-[14px] text-muted-foreground mt-2">
              新的一天，从计划开始
            </p>
          </div>

          <div className="relative shrink-0" suppressHydrationWarning>
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl dark:bg-primary/12" aria-hidden="true" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/80 text-[34px] backdrop-blur-xl shadow-sm dark:bg-[#1a1a20]/60">
              {greetingEmoji}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="animate-fade-up stagger-1">
        <QuickActions />
      </div>

      {/* Sortable Dashboard Sections */}
      <SortableDashboard />
    </div>
  );
}
