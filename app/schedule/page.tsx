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
  { id: "today", label: "今日", icon: "📅" },
  { id: "week", label: "本周", icon: "📆" },
  { id: "query", label: "查询", icon: "🔍" },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col -mx-4 md:-mx-8 lg:-mx-10">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-lg font-bold font-display">课表</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
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
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
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
