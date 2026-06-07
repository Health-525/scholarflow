"use client";

import { useState, useEffect } from "react";
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
  const [greeting, setGreeting] = useState({ text: "你好", emoji: "👋", date: "" });

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const text =
      hour < 6  ? "深夜了" :
      hour < 10 ? "早安" :
      hour < 13 ? "上午好" :
      hour < 18 ? "下午好" :
      hour < 22 ? "晚上好" : "夜深了";
    const emoji =
      hour < 6  ? "🌙" :
      hour < 10 ? "☀️" :
      hour < 13 ? "🌤️" :
      hour < 18 ? "🌤️" :
      hour < 22 ? "🌙" : "🌙";
    const date = now.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    setGreeting({ text, emoji, date });
  }, []);

  return greeting;
}

export default function DashboardPage() {
  const { text: greeting, emoji: greetingEmoji, date: dateStr } = useGreeting();

  return (
    <div className="max-w-5xl mx-auto py-7 pb-24 md:pb-8">

      {/* ── Header ── */}
      <header className="mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div>
            <h1
              className="text-[22px] font-semibold leading-tight"
              style={{
                fontFamily: "'Noto Serif SC', Georgia, serif",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {greeting}
            </h1>
            <p
              className="text-[12px] mt-1 tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              {dateStr}
            </p>
          </div>
          <span className="text-2xl leading-tight ml-auto" aria-hidden="true">
            {greetingEmoji}
          </span>
        </div>
        {/* Decorative line */}
        <div className="mt-4 h-px" style={{ background: "linear-gradient(90deg, var(--accent) 0%, var(--border) 40%, transparent 100%)", opacity: 0.5 }} />
      </header>

      {/* ── Summary Stats (2×2 on mobile, 4-col on sm+) ── */}
      <SummaryBanner />

      {/* ── Main Cards ── */}
      <div className="space-y-4 mb-6">
        {/* 今日课表 + 待办作业：并排 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-fade-up stagger-1">
            <ScheduleCard />
          </div>
          <div className="animate-fade-up stagger-2">
            <AssignmentsCard />
          </div>
        </div>

        {/* 绩点 + 跑步 + 考试：三列 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="animate-fade-up stagger-3">
            <GPACard />
          </div>
          <div className="animate-fade-up stagger-4">
            <RunningCard />
          </div>
          <div className="animate-fade-up stagger-5">
            <ExamCountdownCard />
          </div>
        </div>

        {/* 日报 + 屏幕时间：并排 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-fade-up stagger-6">
            <RecentDailyCard />
          </div>
          <div className="animate-fade-up stagger-7">
            <ScreenTimeCard />
          </div>
        </div>
      </div>

      {/* ── 数据可视化 ── */}
      <StatsDashboard />

      {/* ── 教务新闻 ── */}
      <div className="animate-fade-up">
        <JwcNewsCard />
      </div>
    </div>
  );
}
