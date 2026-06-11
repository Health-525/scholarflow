"use client";

import { useState } from "react";
import { useScheduleQuery } from "@/hooks/useQueries";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { TodayView } from "@/components/schedule/TodayView";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { QueryView } from "@/components/schedule/QueryView";

type Tab = "today" | "week" | "query";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "今日", icon: "☀️" },
  { id: "week", label: "本周", icon: "📅" },
  { id: "query", label: "查询", icon: "🔍" },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground flex flex-col animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 py-4 animate-fade-up">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">课表</h1>
          <p className="text-[12px] text-muted-foreground">今日课程与周视图</p>
        </div>
      </div>

      {/* Tabs — segmented control style */}
      <div className="mb-4 animate-fade-up stagger-1">
        <div
          className="flex rounded-xl p-1 bg-secondary border border-border"
          role="tablist"
          aria-label="课表视图切换"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
            >
              <span className="mr-1" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
        {isLoading && (
          <div className="py-16">
            <LoadingSpinner label="加载课表..." />
          </div>
        )}

        {error && !isLoading && (
          <ErrorFallback
            message={error.message}
            onRetry={() => refetch()}
          />
        )}

        {schedule && !isLoading && !error && (
          <div className="animate-fade-up">
            {activeTab === "today" && (
              <TodayView schedule={schedule} adjustments={adjustments} />
            )}
            {activeTab === "week" && (
              <WeekGrid schedule={schedule} adjustments={adjustments} />
            )}
            {activeTab === "query" && (
              <QueryView schedule={schedule} adjustments={adjustments} />
            )}
          </div>
        )}

        {!schedule && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm font-medium text-foreground">暂无课表数据</p>
            <p className="text-xs text-muted-foreground mt-1">请在设置中导入课表</p>
          </div>
        )}
      </div>
    </div>
  );
}