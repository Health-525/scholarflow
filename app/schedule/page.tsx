"use client";

import { Calendar, CalendarDays, RotateCcw, Search, Sun } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { QueryView } from "@/components/schedule/QueryView";
import { TodayView } from "@/components/schedule/TodayView";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useScheduleAdjustments, useScheduleQuery } from "@/hooks/useQueries";
import { getWeekNumber } from "@/lib/schedule/schedule";
import { getNowInTimeZone, normalizeDate } from "@/lib/schedule/timezone";

const MobileSchedule = lazy(() =>
  import("@/components/ximi/MobileSchedule").then((m) => ({ default: m.MobileSchedule }))
);

type Tab = "today" | "week" | "query";

const TABS: SegmentedOption[] = [
  { id: "today", label: "今日", icon: Sun },
  { id: "week", label: "本周", icon: CalendarDays },
  { id: "query", label: "查询", icon: Search },
];

export default function SchedulePage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<Tab>("week");
  const { data, isLoading, error, refetch } = useScheduleQuery();
  const schedule = data?.schedule ?? null;
  const adjustments = data?.adjustments ?? [];
  const {
    add: addAdjustment,
    remove: removeAdjustment,
    clear: clearAdjustments,
  } = useScheduleAdjustments(schedule);

  // Calculate current week number
  const weekInfo = useMemo(() => {
    if (!schedule) return null;
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const now = getNowInTimeZone(tz);
    const weekNum = getWeekNumber(normalizeDate(now), schedule.meta.week1_monday);
    const semester = schedule.meta.semester || "";
    return { weekNum, semester, tz };
  }, [schedule]);

  if (isMobile) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="max-w-md mx-auto py-6 animate-page"><div className="h-96 rounded-2xl bg-card border border-border skeleton" /></div>}>
          <MobileSchedule
            schedule={schedule}
            adjustments={adjustments}
            onAddAdjustment={addAdjustment}
            onRemoveAdjustment={removeAdjustment}
            onClearAdjustments={clearAdjustments}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground flex flex-col animate-page">
      <PageHeader
        icon={<Calendar className="w-5 h-5 text-primary" />}
        title="课表"
        actions={
          weekInfo ? (
            <div className="flex items-center gap-2">
              {weekInfo.semester && (
                <Badge variant="secondary">{weekInfo.semester}</Badge>
              )}
              <Badge>第{weekInfo.weekNum}周</Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                aria-label="刷新课表"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => refetch()}
              aria-label="刷新课表"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-4 animate-fade-up stagger-1">
        <SegmentedControl
          options={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as Tab)}
          aria-label="课表视图切换"
        />
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
              <WeekGrid
                schedule={schedule}
                adjustments={adjustments}
                onAddAdjustment={addAdjustment}
                onRemoveAdjustment={removeAdjustment}
                onClearAdjustments={clearAdjustments}
              />
            )}
            {activeTab === "query" && (
              <QueryView schedule={schedule} adjustments={adjustments} />
            )}
          </div>
        )}

        {!schedule && !isLoading && !error && (
          <EmptyState
            icon={Calendar}
            title="暂无课表数据"
            description="请在设置中登录并同步数据"
          />
        )}
      </div>
    </div>
  );
}
