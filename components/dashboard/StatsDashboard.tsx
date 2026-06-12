"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useScheduleQuery, useAssignmentsQuery, useRunningQuery } from "@/hooks/useQueries";
import { getWeekNumber, getItemsForDate } from "@/lib/schedule/schedule";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import { classifyUrgency } from "@/lib/assignment-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Recharts SVG doesn't support CSS variables — use computed values
// Safe for SSR: returns light-mode defaults, then updates on client mount
function getChartColors() {
  if (typeof window === "undefined") {
    return {
      primary: "#2a4494",
      primaryLight: "rgba(42,68,148,0.10)",
      border: "rgba(26,21,16,0.06)",
      mutedFg: "rgba(26,21,16,0.50)",
      cardBg: "#fffdf9",
      foreground: "#1a1510",
      success: "#2d7a4f",
      warning: "#b85c00",
      error: "#c0392b",
    };
  }
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    || (document.documentElement.getAttribute("data-theme") !== "light"
        && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    primary: isDark ? "#818CF8" : "#2a4494",
    primaryLight: isDark ? "rgba(129,140,248,0.14)" : "rgba(42,68,148,0.10)",
    border: isDark ? "rgba(248,250,252,0.08)" : "rgba(26,21,16,0.06)",
    mutedFg: isDark ? "rgba(248,250,252,0.50)" : "rgba(26,21,16,0.50)",
    cardBg: isDark ? "#0F172A" : "#fffdf9",
    foreground: isDark ? "#F8FAFC" : "#1a1510",
    success: isDark ? "#22C55E" : "#2d7a4f",
    warning: isDark ? "#F59E0B" : "#b85c00",
    error: isDark ? "#EF4444" : "#c0392b",
  };
}

const TOOLTIP_STYLE = {
  backgroundColor: "#161b22",
  border: "1px solid rgba(201,209,217,0.12)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#1a1510",
  boxShadow: "0 4px 12px rgba(26,21,16,0.08)",
};

// ── 作业完成统计 ──────────────────────────────────────────
function AssignmentsChart() {
  const { assignments, isLoading, error } = useAssignmentsQuery();
  const colors = getChartColors();

  const data = useMemo(() => {
    if (!assignments.length) return [];
    const done = assignments.filter((a) => a.done).length;
    const pending = assignments.length - done;
    return [
      { name: "已完成", value: done, color: colors.success },
      { name: "待完成", value: pending, color: colors.warning },
    ];
  }, [assignments, colors.success, colors.warning]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (error) return <ErrorFallback message={error.message} />;
  if (!data.length) return null;

  const tooltipStyle = { ...TOOLTIP_STYLE, backgroundColor: colors.cardBg, color: colors.foreground, border: `1px solid ${colors.border}` };

  return (
      <div className="rounded-2xl p-4 bg-card border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/10">
          <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2m6 0a2 2 0 002 2" />
          </svg>
        </div>
        <h3 className="text-[13px] font-semibold text-foreground font-display">作业完成率</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
            {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 本周课表统计 ───────────────────────────────────────────
function WeeklyScheduleChart() {
  const { data, isLoading } = useScheduleQuery();
  const schedule = data?.schedule;
  const colors = getChartColors();

  const chartData = useMemo(() => {
    if (!schedule) return [];
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const today = getNowInTimeZone(tz);
    const weekNum = getWeekNumber(today, schedule.meta.week1_monday);
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

  const tooltipStyle = { ...TOOLTIP_STYLE, backgroundColor: colors.cardBg, color: colors.foreground, border: `1px solid ${colors.border}` };

  return (
      <div className="rounded-2xl p-4 bg-card border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/10">
          <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-[13px] font-semibold text-foreground font-display">本周课程分布</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.mutedFg }} axisLine={{ stroke: colors.border }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.mutedFg }} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="课程数" fill={colors.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 跑步进度趋势 ──────────────────────────────────────────
function RunningTrendChart() {
  const { records, isLoading } = useRunningQuery();
  const colors = getChartColors();

  const data = useMemo(() => {
    if (!records.length) return [];
    const weeklyMap: Record<string, number> = {};
    records.forEach((r) => {
      const d = new Date(r.date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
      weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });
    return Object.entries(weeklyMap).slice(-8).map(([week, count]) => ({ week, 跑步次数: count }));
  }, [records]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (!data.length) return null;

  const tooltipStyle = { ...TOOLTIP_STYLE, backgroundColor: colors.cardBg, color: colors.foreground, border: `1px solid ${colors.border}` };

  return (
      <div className="rounded-2xl p-4 md:col-span-2 bg-card border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-green-600/10">
          <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-[13px] font-semibold text-foreground font-display">跑步趋势 (最近8周)</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: colors.mutedFg }} axisLine={{ stroke: colors.border }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.mutedFg }} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="跑步次数" stroke={colors.success} strokeWidth={2.5} dot={{ fill: colors.success, r: 4, strokeWidth: 0 }} activeDot={{ fill: colors.primary, r: 6, strokeWidth: 2, stroke: colors.primaryLight }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 作业紧急程度分布 ────────────────────────────────────
function UrgencyChart() {
  const { assignments, isLoading } = useAssignmentsQuery();
  const colors = getChartColors();

  const data = useMemo(() => {
    if (!assignments.length) return [];
    const pending = assignments.filter((a) => !a.done);
    const counts = { overdue: 0, urgent: 0, reminder: 0, normal: 0 };
    pending.forEach((a) => { counts[classifyUrgency(a.deadline, new Date())]++; });
    return [
      { name: "已逾期", value: counts.overdue, color: colors.error },
      { name: "紧急(24h)", value: counts.urgent, color: colors.warning },
      { name: "即将(72h)", value: counts.reminder, color: "#f1c40f" },
      { name: "正常", value: counts.normal, color: colors.success },
    ].filter((d) => d.value > 0);
  }, [assignments, colors]);

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />;
  if (!data.length) return null;

  const tooltipStyle = { ...TOOLTIP_STYLE, backgroundColor: colors.cardBg, color: colors.foreground, border: `1px solid ${colors.border}` };

  return (
      <div className="rounded-2xl p-4 bg-card border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/10">
          <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-[13px] font-semibold text-foreground font-display">待办紧急程度</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: colors.mutedFg }} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: colors.mutedFg }} width={50} axisLine={{ stroke: colors.border }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
            {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────────
export function StatsDashboard() {
  return (
      <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
          <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-[13px] font-semibold text-foreground font-display">数据可视化</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AssignmentsChart />
        <WeeklyScheduleChart />
        <UrgencyChart />
        <RunningTrendChart />
      </div>
    </div>
  );
}
