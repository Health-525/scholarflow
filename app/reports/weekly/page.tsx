"use client";

import { useState, useMemo } from "react";
import { useWeeklyReports } from "@/hooks/useReports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";

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
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4 text-foreground">
        周报
      </h1>

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
            <div className="rounded-2xl p-8 text-center bg-card border border-border">
              <p className="text-muted-foreground">暂无周报</p>
            </div>
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
