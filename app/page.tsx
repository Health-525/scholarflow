"use client";

import { Clock } from "lucide-react";
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
import { useScheduleQuery } from "@/hooks/useQueries";
import { useDashboardSummary } from "@/lib/dashboard/use-dashboard-summary";
import { getWeekNumber } from "@/lib/schedule/schedule";

const MobileHome = lazy(() =>
  import("@/components/ximi/MobileHome").then((m) => ({ default: m.MobileHome }))
);

function useGreeting() {
  const [greeting, setGreeting] = useState({
    text: "你好",
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

      const date = now.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      setGreeting((prev) => {
        if (prev.text === text && prev.date === date) {
          return prev;
        }
        return { text, date };
      });
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}

function useCurrentTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return time;
}

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { text: greeting, date: dateStr } = useGreeting();
  const currentTime = useCurrentTime();
  const { data: dashboardData, loading: dashboardLoading } =
    useDashboardSummary();
  const { data: scheduleData } = useScheduleQuery();

  const currentWeek = (() => {
    const week1Monday = scheduleData?.schedule?.meta?.week1_monday;
    if (!week1Monday) return null;
    return getWeekNumber(new Date(), week1Monday);
  })();

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
    <div className="max-w-5xl mx-auto py-5 pb-24 md:pb-10 space-y-5">
      {/* Header */}
      <header className="rounded-2xl bg-card border border-black/[0.04] dark:border-white/[0.06] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div suppressHydrationWarning>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {greeting}
              </h1>
              {currentWeek && (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  第{currentWeek}周
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateStr}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <Clock className="size-4 text-primary" />
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {currentTime}
              </span>
            </div>
            <RefreshButton />
          </div>
        </div>
      </header>

      <QuickActions />

      {/* Academic section */}
      <section className="space-y-4">
        <SummaryBanner data={dashboardData} loading={dashboardLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScheduleCard />
          <AssignmentsCard />
        </div>
      </section>

      {/* Other widgets */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExamCountdownCard />
        <ScreenTimeCard />
        <RecentDailyCard />
        <JwcNewsCard />
      </section>
    </div>
  );
}
