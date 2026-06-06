"use client";

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

export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6  ? "深夜了" :
    hour < 10 ? "早安" :
    hour < 13 ? "上午好" :
    hour < 18 ? "下午好" :
    hour < 22 ? "晚上好" : "夜深了";

  const greetingEmoji =
    hour < 6  ? "🌙" :
    hour < 10 ? "☀️" :
    hour < 13 ? "🌤️" :
    hour < 18 ? "🌤️" :
    hour < 22 ? "🌙" : "🌙";

  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="max-w-5xl mx-auto py-7 pb-24 md:pb-8">

      {/* ── Header ── */}
      <header className="mb-7 animate-fade-up">
        <div className="flex items-end gap-2.5">
          <h1
            className="text-2xl font-semibold leading-tight"
            style={{
              fontFamily: "'Noto Serif SC', Georgia, serif",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {greeting}
          </h1>
          <span className="text-2xl leading-tight mb-0.5" aria-hidden="true">
            {greetingEmoji}
          </span>
        </div>
        <p
          className="text-sm mt-1.5 tracking-wide"
          style={{ color: "var(--text-tertiary)", fontSize: "12.5px" }}
        >
          {dateStr}
        </p>
        {/* Decorative underline */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, var(--accent) 0%, transparent 100%)", maxWidth: 64, opacity: 0.4 }}
          />
          <div
            className="h-px flex-1"
            style={{ background: "var(--border-subtle)" }}
          />
        </div>
      </header>

      {/* ── Summary Banner ── */}
      <SummaryBanner />

      {/* ── Cards：移动端单列，桌面端 2×2，大屏3列 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="animate-fade-up stagger-1">
          <ScheduleCard />
        </div>
        <div className="animate-fade-up stagger-2">
          <AssignmentsCard />
        </div>
        <div className="animate-fade-up stagger-3">
          <RunningCard />
        </div>
        <div className="animate-fade-up stagger-4">
          <RecentDailyCard />
        </div>
        <div className="animate-fade-up stagger-5">
          <ScreenTimeCard />
        </div>
        <div className="animate-fade-up stagger-6">
          <GPACard />
        </div>
        <div className="animate-fade-up stagger-7">
          <ExamCountdownCard />
        </div>
      </div>

      {/* ── 数据可视化 ── */}
      <StatsDashboard />

      {/* ── 教务新闻 ── */}
      <div className="animate-fade-up stagger-5">
        <JwcNewsCard />
      </div>
    </div>
  );
}
