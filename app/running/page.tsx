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
    <div className="min-h-screen bg-background text-foreground -mx-4 md:-mx-8 lg:-mx-10">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold font-display">阳光长跑</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          aria-label={showForm ? "收起表单" : "记录跑步"}
        >
          {showForm ? "收起" : "+ 记录"}
        </button>
      </div>

      <div className="px-5 pb-6">
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
