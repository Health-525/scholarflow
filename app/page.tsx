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

function useHeroStats() {
  const [stats, setStats] = useState<{ courses: number; assignments: number; running: string } | null>(null);
  useEffect(() => {
    fetch("/api/local-data?type=dashboard")
      .then(r => r.json())
      .then(d => {
        if (d?.overview) {
          setStats({
            courses: d.overview.courses ?? 0,
            assignments: d.overview.pendingAssignments ?? 0,
            running: `${d.overview.running?.total ?? 0}/50`,
          });
        }
      })
      .catch(() => {});
  }, []);
  return stats;
}

export default function DashboardPage() {
  const { text: greeting, emoji: greetingEmoji, date: dateStr } = useGreeting();
  const heroStats = useHeroStats();

  return (
    <div className="max-w-[1280px] mx-auto py-5 pb-24 md:pb-10 space-y-6 animate-page">
      {/* Hero + Quick Actions — unified header */}
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#E8EAFF] to-[#F5F3FF] dark:from-primary/[0.08] dark:to-primary/[0.03] shadow-sm animate-fade-up">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative px-6 pt-4 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0" suppressHydrationWarning>
              <h1 className="text-[26px] font-bold leading-tight font-display text-foreground tracking-tight">
                {greeting}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {dateStr} · 新的一天，从计划开始
              </p>
              {heroStats && (
                <p className="text-[12px] text-muted-foreground/60 mt-1.5 flex items-center gap-3">
                  <span>课程 {heroStats.courses}</span>
                  <span>作业 {heroStats.assignments}</span>
                  <span>跑步 {heroStats.running}</span>
                </p>
              )}
            </div>

            <div className="relative shrink-0 flex items-center gap-3" suppressHydrationWarning>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/80 text-[28px] backdrop-blur-xl shadow-sm dark:bg-[#1a1a20]/60">
                {greetingEmoji}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions inside Hero */}
        <div className="relative px-6 pb-4 animate-fade-up stagger-1">
          <QuickActions />
        </div>
      </header>

      {/* Sortable Dashboard Sections */}
      <SortableDashboard />
    </div>
  );
}
