"use client";

import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";

export default function DashboardPage() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "早安" : now.getHours() < 18 ? "下午好" : "晚上好";
  const dateStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {greeting} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {dateStr}
        </p>
      </div>

      {/* Dashboard grid — each card has independent error fallback */}
      <div className="grid grid-cols-1 gap-4">
        <ScheduleCard />
        <AssignmentsCard />
        <RunningCard />
        <RecentDailyCard />
      </div>
    </div>
  );
}
