"use client";

import { Timer } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PomodoroTimer } from "@/components/pomodoro/PomodoroTimer";

export default function PomodoroPage() {
  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      <PageHeader
        icon={<Timer className="w-5 h-5 text-primary" />}
        title="番茄钟"
        description="专注 · 休息 · 循环"
      />
      <PomodoroTimer />
    </div>
  );
}
