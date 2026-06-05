"use client";

import { StatsDashboard } from "@/components/dashboard/StatsDashboard";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { calculateRunStats } from "@/lib/running-utils";
import { useMemo } from "react";

export default function StatsPage() {
  const { data: scheduleData } = useScheduleQuery();
  const { assignments } = useAssignmentsQuery();
  const { records } = useRunningQuery();

  const schedule = scheduleData?.schedule;
  const stats = useMemo(() => calculateRunStats(records), [records]);

  const completedAssignments = assignments.filter((a) => a.done).length;
  const totalCourses = schedule?.courses?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto py-6 pb-24 md:pb-8">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        数据统计
      </h1>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="课程数" value={totalCourses} unit="门" color="#2a4494" />
        <StatCard label="作业完成" value={completedAssignments} unit={`/ ${assignments.length}`} color="#2d7a4f" />
        <StatCard label="跑步次数" value={stats.total} unit="/ 50" color="#068ca0" />
        <StatCard label="跑步进度" value={Math.round(stats.progressPercent)} unit="%" color="#6446a0" />
      </div>

      {/* 图表 */}
      <StatsDashboard />
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: string;
}) {
  return (
    <div className="sf-card p-4 text-center">
      <p className="text-[11px] mb-1.5" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <div className="flex items-baseline justify-center gap-1">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color, fontFamily: "'Noto Serif SC', Georgia, serif" }}
        >
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
