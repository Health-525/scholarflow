"use client";

import { FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { DailyEditor } from "@/components/reports/DailyEditor";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useDailyReports } from "@/hooks/useReports";

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
    <div className="max-w-5xl mx-auto py-6 animate-page">
      <PageHeader
        icon={<FileText className="w-5 h-5 text-primary" />}
        title="日报"
        description="每日学习总结与反思"
        actions={
          <Button onClick={() => setShowEditor((v) => !v)}>
            {showEditor ? "收起" : "新建日报"}
          </Button>
        }
      />

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
            <EmptyState
              title="暂无日报"
              description={
                startDate || endDate
                  ? "当前筛选条件下没有日报，尝试调整日期范围"
                  : "点击右上角“新建日报”按钮，开始记录今天的学习总结"
              }
            />
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
