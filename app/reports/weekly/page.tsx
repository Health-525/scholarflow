"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useWeeklyReports } from "@/hooks/useReports";

export default function WeeklyReportsPage() {
  const { entries, isLoading, error, reload } = useWeeklyReports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    if (!startDate && !endDate) return entries;
    return entries.filter((e) => {
      const slug = e.name.replace(".md", "");
      const weekStart = slug.split("_")[0] ?? slug;
      if (startDate && weekStart < startDate) return false;
      if (endDate && weekStart > endDate) return false;
      return true;
    });
  }, [entries, startDate, endDate]);

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-primary" />}
        title="周报"
        description="每周学习趋势分析"
      />

      <div className="mb-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onReset={() => { setStartDate(""); setEndDate(""); }}
        />
      </div>

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载周报列表..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={reload} />
      )}

      {!isLoading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState
              title="暂无周报"
              description={
                startDate || endDate
                  ? "当前筛选条件下没有周报，尝试调整日期范围"
                  : "系统会根据学习数据自动生成周报，快来开始学习吧"
              }
            />
          ) : (
            filtered.map((entry) => (
              <ReportListItem key={entry.path} entry={entry} type="weekly" />
            ))
          )}
        </div>
      )}
    </div>
  );
}
