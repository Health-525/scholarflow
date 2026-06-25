"use client";

import { lazy, Suspense, useEffect, useState } from "react";

import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDashboardSummary } from "@/lib/dashboard/use-dashboard-summary";

const MobileHome = lazy(() =>
  import("@/components/ximi/MobileHome").then((m) => ({ default: m.MobileHome }))
);

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

      setGreeting((prev) => {
        if (prev.text === text && prev.emoji === emoji && prev.date === date) {
          return prev;
        }
        return { text, emoji, date };
      });
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { text: greeting, emoji: greetingEmoji, date: dateStr } = useGreeting();
  const { data: dashboardData, loading: dashboardLoading } =
    useDashboardSummary();

  if (isMobile) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="max-w-md mx-auto py-5"><div className="h-80 rounded-3xl border border-border bg-card skeleton" /></div>}>
          <MobileHome />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-5 pb-24 md:pb-10 space-y-6">
      {/* Hero + Quick Actions — unified header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] border border-border shadow-sm">
        <div className="relative px-6 pt-4 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0" suppressHydrationWarning>
              <h1 className="text-3xl font-bold leading-tight font-display text-foreground tracking-tight">
                {greeting}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {dateStr} · 新的一天，从计划开始
              </p>
            </div>

            <div
              className="relative shrink-0 flex items-center gap-3"
              suppressHydrationWarning
            >
              <RefreshButton />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card/80 text-3xl backdrop-blur-xl shadow-sm dark:bg-secondary/80">
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
          <SummaryBanner data={dashboardData} loading={dashboardLoading} />
        </div>

        <div className="space-y-2.5">
          <ScheduleCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssignmentsCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScreenTimeCard />
          <ExamCountdownCard />
          <RecentDailyCard />
        </div>

        <JwcNewsCard />
      </section>
    </div>
  );
}
