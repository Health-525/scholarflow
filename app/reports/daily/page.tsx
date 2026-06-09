"use client";

import { useState, useMemo } from "react";
import { useDailyReports } from "@/hooks/useReports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { DailyEditor } from "@/components/reports/DailyEditor";

export default function DailyReportsPage() {
  const { entries, isLoading, error, reload } = useDailyReports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showEditor, setShowEditor] = useState(false);

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
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4 text-foreground">
        日报
      </h1>

      {/* New report button */}
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="mb-4 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
        >
          + 新建日报
        </button>
      )}

      {/* Editor */}
      {showEditor && (
        <DailyEditor
          onSaved={() => { setShowEditor(false); reload(); }}
          onCancel={() => setShowEditor(false)}
        />
      )}

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
            <div className="rounded-2xl p-8 text-center bg-card border border-border">
              <p className="text-muted-foreground">暂无日报</p>
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
