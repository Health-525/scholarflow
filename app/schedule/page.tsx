"use client";

import { useState, useMemo } from "react";

import { QueryView } from "@/components/schedule/QueryView";
import { TodayView } from "@/components/schedule/TodayView";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useScheduleQuery } from "@/hooks/useQueries";
import { getWeekNumber } from "@/lib/schedule/schedule";
import { getNowInTimeZone, normalizeDate } from "@/lib/schedule/timezone";

type Tab = "today" | "week" | "query";

const TABS: { id: Tab; label: string; iconPath: string }[] = [
  { id: "today", label: "今日", iconPath: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "week", label: "本周", iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "query", label: "查询", iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("week");
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];

  // Calculate current week number
  const weekInfo = useMemo(() => {
    if (!schedule) return null;
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const now = getNowInTimeZone(tz);
    const weekNum = getWeekNumber(normalizeDate(now), schedule.meta.week1_monday);
    const semester = schedule.meta.semester || "";
    return { weekNum, semester, tz };
  }, [schedule]);

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground flex flex-col animate-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 py-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">课表</h1>
            {weekInfo && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-muted-foreground">
                  {weekInfo.semester}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                  第{weekInfo.weekNum}周
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="刷新课表"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Tabs — segmented control style */}
      <div className="mb-4 animate-fade-up stagger-1">
        <div
          className="flex rounded-xl p-1 bg-secondary border border-border dark:border-white/10"
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
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.iconPath} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
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
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">暂无课表数据</p>
            <p className="text-xs text-muted-foreground mt-1">请在设置中登录并同步数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
