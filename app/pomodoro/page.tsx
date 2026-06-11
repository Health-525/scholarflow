"use client";

import { PomodoroTimer } from "@/components/pomodoro/PomodoroTimer";

export default function PomodoroPage() {
  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">番茄钟</h1>
          <p className="text-[12px] text-muted-foreground">专注 · 休息 · 循环</p>
        </div>
      </div>
      <PomodoroTimer />
    </div>
  );
}