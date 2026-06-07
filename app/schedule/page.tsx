"use client";

import { useState } from "react";
import { useScheduleQuery } from "@/hooks/useQueries";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { TodayView } from "@/components/schedule/TodayView";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { QueryView } from "@/components/schedule/QueryView";

type Tab = "today" | "week" | "query";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "今日" },
  { id: "week", label: "本周" },
  { id: "query", label: "查询" },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        课表
      </h1>

      {/* Tabs */}
      <div
        className="flex rounded-xl overflow-hidden mb-5 p-1"
        style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
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
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
            }}
            aria-label={tab.label}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="py-12">
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
        <>
          {activeTab === "today" && (
            <TodayView schedule={schedule} adjustments={adjustments} />
          )}
          {activeTab === "week" && (
            <WeekGrid schedule={schedule} adjustments={adjustments} />
          )}
          {activeTab === "query" && (
            <QueryView schedule={schedule} adjustments={adjustments} />
          )}
        </>
      )}

      {!schedule && !isLoading && !error && (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm">暂无课表数据</p>
          <p className="text-xs mt-1">请在设置中导入课表</p>
        </div>
      )}
    </div>
  );
}
