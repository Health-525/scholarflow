"use client";

import { CalendarDays, FileText, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { showToast } from "@/components/ui/ToastContainer";
import { useWeeklyReports } from "@/hooks/useReports";
import { getAuthParams } from "@/lib/api/auth-params";

export default function WeeklyReportsPage() {
  const { entries, isLoading, error, reload } = useWeeklyReports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);

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

  const currentWeekSlug = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (date: Date) => date.toISOString().slice(0, 10);
    return `${fmt(monday)}_${fmt(sunday)}`;
  }, []);

  const currentWeekEntry = entries.find((e) => e.name.replace(".md", "") === currentWeekSlug);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/reports/weekly/generate?${getAuthParams()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; slug?: string; ai?: boolean; error?: string };
      if (res.ok && data.ok) {
        showToast("success", data.ai ? "AI 周报生成成功" : "已使用模板生成周报");
        reload();
      } else {
        showToast("error", data.error || "周报生成失败");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "周报生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-primary" />}
        title="周报"
        description="每周学习趋势分析"
        actions={
          <div className="flex items-center gap-2">
            {currentWeekEntry ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/reports/weekly/${currentWeekSlug}`, "_self")}
                  className="gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  查看本周周报
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  {generating ? "生成中..." : "重新生成"}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? "生成中..." : "生成本周周报"}
              </Button>
            )}
          </div>
        }
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
                  : "点击右上角「生成本周周报」，系统会根据你的日报和作业数据自动汇总"
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
