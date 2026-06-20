"use client";

import { useEffect, useState } from "react";

import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";
import { MobileHome } from "@/components/ximi/MobileHome";
import { useDashboardSummary } from "@/lib/dashboard/use-dashboard-summary";
import { RUNNING_GOAL } from "@/lib/running-utils";

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
        hour < 6
          ? "夜深了"
          : hour < 9
            ? "早安"
            : hour < 12
              ? "上午好"
              : hour < 14
                ? "中午好"
                : hour < 18
                  ? "下午好"
                  : hour < 22
                    ? "晚上好"
                    : "夜深了";

      const emoji =
        hour < 6
          ? "🌙"
          : hour < 9
            ? "☀️"
            : hour < 12
              ? "🌤️"
              : hour < 14
                ? "🍜"
                : hour < 18
                  ? "⚡"
                  : hour < 22
                    ? "🌃"
                    : "🌙";

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
  const { data: dashboardData, loading: dashboardLoading } =
    useDashboardSummary();

  const heroStats = dashboardData?.overview
    ? {
        courses: dashboardData.overview.courses ?? 0,
        assignments: dashboardData.overview.pendingAssignments ?? 0,
        running: `${dashboardData.overview.running?.total ?? 0}/${RUNNING_GOAL}`,
      }
    : null;

  return (
    <>
      {/* 移动端：萌系「小咪」首页 */}
      <MobileHome />

      {/* 桌面端：原版仪表盘（保持不变） */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-5 pb-24 md:pb-10 space-y-6 animate-page">
      {/* Hero + Quick Actions — unified header */}
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] border border-border shadow-sm animate-fade-up">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/8 dark:bg-primary/[0.03] blur-3xl" />
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

            <div
              className="relative shrink-0 flex items-center gap-3"
              suppressHydrationWarning
            >
              <RefreshButton />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] bg-card/80 text-[28px] backdrop-blur-xl shadow-sm dark:bg-secondary/80">
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

      {/* Dashboard Sections */}
      <section className="space-y-4 animate-fade-up stagger-2">
        <div className="space-y-2.5">
          <span className="block text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase px-1">
            快捷统计
          </span>
          <SummaryBanner data={dashboardData} loading={dashboardLoading} />
        </div>

        <div className="space-y-2.5">
          <span className="block text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase px-1">
            今日焦点
          </span>
          <ScheduleCard />
        </div>

        <div className="space-y-2.5">
          <span className="block text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase px-1">
            任务与健康
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AssignmentsCard />
            <RunningCard />
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="block text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase px-1">
            数据追踪
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScreenTimeCard />
            <ExamCountdownCard />
            <RecentDailyCard />
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="block text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase px-1">
            信息浏览
          </span>
          <JwcNewsCard />
        </div>
      </section>
    </div>
    </>
  );
}
