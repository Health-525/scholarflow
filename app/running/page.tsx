"use client";

import { useState } from "react";
import { useRunningQuery } from "@/hooks/useQueries";
import { calculateRunStats } from "@/lib/running-utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { RunningStats } from "@/components/running/RunningStats";
import { RunningHeatmap } from "@/components/running/RunningHeatmap";
import { AddRunningForm } from "@/components/running/AddRunningForm";

export default function RunningPage() {
  const { records, isLoading, error, addRecord, reload } = useRunningQuery();
  const [showForm, setShowForm] = useState(false);

  const stats = calculateRunStats(records);

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 py-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-green-600/10">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">阳光长跑</h1>
          <p className="text-[12px] text-muted-foreground">学期跑步进度追踪</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 shrink-0"
          aria-label={showForm ? "收起表单" : "记录跑步"}
        >
          {showForm ? "收起" : "+ 记录"}
        </button>
      </div>

      <div className="pb-6">
        {showForm && (
          <div className="mb-4">
            <AddRunningForm
              records={records}
              onAdd={addRecord}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {isLoading && (
          <div className="py-12">
            <LoadingSpinner label="加载跑步记录..." />
          </div>
        )}

        {error && !isLoading && (
          <ErrorFallback message={error.message} onRetry={reload} />
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            <RunningStats stats={stats} />
            <RunningHeatmap records={records} />
          </div>
        )}
      </div>
    </div>
  );
}
