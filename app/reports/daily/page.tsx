"use client";

import { useState, useMemo } from "react";
import { useDailyReports } from "@/hooks/useReports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";

export default function DailyReportsPage() {
  const { entries, isLoading, error, reload } = useDailyReports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    if (!startDate && !endDate) return entries;
    return entries.filter((e) => {
      const date = e.name.replace(".md", "");
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
  }, [entries, startDate, endDate]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        日报
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
          <LoadingSpinner label="加载日报列表..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={reload} />
      )}

      {!isLoading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--text-tertiary)" }}>暂无日报</p>
            </div>
          ) : (
            filtered.map((entry) => (
              <ReportListItem key={entry.path} entry={entry} type="daily" />
            ))
          )}
        </div>
      )}
    </div>
  );
}
