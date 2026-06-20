"use client";

import { Footprints, Zap } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { AddRunningForm } from "@/components/running/AddRunningForm";
import { RunningHeatmap } from "@/components/running/RunningHeatmap";
import { RunningStats } from "@/components/running/RunningStats";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useRunningQuery } from "@/hooks/useQueries";
import { calculateRunStats } from "@/lib/running-utils";

export default function RunningPage() {
  const { records, isLoading, error, addRecord, reload } = useRunningQuery();
  const [showForm, setShowForm] = useState(false);

  const stats = calculateRunStats(records);

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-background text-foreground animate-page">
      <PageHeader
        icon={<Zap className="w-5 h-5 text-[var(--status-success)]" />}
        title="阳光长跑"
        description="学期跑步进度追踪"
        actions={
          <Button
            onClick={() => setShowForm(!showForm)}
            aria-label={showForm ? "收起表单" : "记录跑步"}
          >
            {showForm ? "收起" : "+ 记录"}
          </Button>
        }
      />

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
          <>
            {records.length === 0 ? (
              <EmptyState
                icon={Footprints}
                title="还没有跑步记录"
                description="点击右上角按钮记录你的第一次跑步"
                action={{
                  label: "记录跑步",
                  onClick: () => setShowForm(true),
                }}
              />
            ) : (
              <div className="space-y-4">
                <RunningStats stats={stats} />
                <RunningHeatmap records={records} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
