"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { getWeekNumber, weekday1to7, getItemsForDate } from "@/lib/schedule/schedule";
import { getNowInTimeZone, normalizeDate } from "@/lib/schedule/timezone";
import { classifyUrgency } from "@/lib/assignment-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

const COLORS = ["#2a4494", "#2d7a4f", "#b85c00", "#6446a0", "#068ca0", "#c0392b", "#8b5cf6", "#059669"];

// ── 作业完成统计 ──────────────────────────────────────────
function AssignmentsChart() {
  const { assignments, isLoading, error } = useAssignmentsQuery();

  const data = useMemo(() => {
    if (!assignments.length) return [];
    const done = assignments.filter((a) => a.done).length;
    const pending = assignments.length - done;
    return [
      { name: "已完成", value: done, color: "#2d7a4f" },
      { name: "待完成", value: pending, color: "#b85c00" },
    ];
  }, [assignments]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (error) return <ErrorFallback message={error.message} />;
  if (!data.length) return null;

  return (
    <div className="sf-card p-4">
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>作业完成率</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 本周课表统计 ───────────────────────────────────────────
function WeeklyScheduleChart() {
  const { data, isLoading } = useScheduleQuery();
  const schedule = data?.schedule;

  const chartData = useMemo(() => {
    if (!schedule) return [];
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const today = getNowInTimeZone(tz);
    const weekNum = getWeekNumber(today, schedule.meta.week1_monday);
    // 从周一开始日期
    const monday = new Date(schedule.meta.week1_monday);
    monday.setDate(monday.getDate() + (weekNum - 1) * 7);

    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    return days.map((day, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      const { items } = getItemsForDate(schedule, date);
      return { day, 课程数: items.length };
    });
  }, [schedule]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (!schedule) return null;

  return (
    <div className="sf-card p-4">
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>本周课程分布</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="课程数" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 跑步进度趋势 ──────────────────────────────────────────
function RunningTrendChart() {
  const { records, isLoading } = useRunningQuery();

  const data = useMemo(() => {
    if (!records.length) return [];
    // 按周聚合
    const weeklyMap: Record<string, number> = {};
    records.forEach((r) => {
      const d = new Date(r.date);
      // 计算该日期所在周的周一
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
      weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });
    return Object.entries(weeklyMap)
      .slice(-8)
      .map(([week, count]) => ({ week, 跑步次数: count }));
  }, [records]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (!data.length) return null;

  return (
    <div className="sf-card p-4 md:col-span-2">
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>跑步趋势 (最近8周)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Line type="monotone" dataKey="跑步次数" stroke="#2d7a4f" strokeWidth={2} dot={{ fill: "#2d7a4f", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 作业紧急程度分布 ────────────────────────────────────
function UrgencyChart() {
  const { assignments, isLoading } = useAssignmentsQuery();

  const data = useMemo(() => {
    if (!assignments.length) return [];
    const pending = assignments.filter((a) => !a.done);
    const counts = { overdue: 0, urgent: 0, reminder: 0, normal: 0 };
    pending.forEach((a) => {
      const urgency = classifyUrgency(a.deadline, new Date());
      counts[urgency]++;
    });
    return [
      { name: "已逾期", value: counts.overdue, color: "#c0392b" },
      { name: "紧急(24h)", value: counts.urgent, color: "#e67e22" },
      { name: "即将(72h)", value: counts.reminder, color: "#f1c40f" },
      { name: "正常", value: counts.normal, color: "#27ae60" },
    ].filter((d) => d.value > 0);
  }, [assignments]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (!data.length) return null;

  return (
    <div className="sf-card p-4">
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>待办紧急程度</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={80} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────────
export function StatsDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
      <AssignmentsChart />
      <WeeklyScheduleChart />
      <UrgencyChart />
      <RunningTrendChart />
    </div>
  );
}
