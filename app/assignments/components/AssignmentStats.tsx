"use client";

import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList } from "lucide-react";

import type { Assignment } from "@/types";

import { classifyAssignment, type Filter } from "../utils";

import { StatCard } from "./StatCard";

export function AssignmentStats({
  assignments,
  filter,
  onFilter,
}: {
  assignments: Assignment[];
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const now = Date.now();
  const pending = assignments.filter((a) => !a.done).length;
  const completed = assignments.length - pending;
  const dueToday = assignments.filter((a) => classifyAssignment(a, now) === "today").length;
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue").length;

  const set = (f: Filter) => onFilter(filter === f ? "all" : f);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={ClipboardList}
        label="待完成"
        value={pending}
        tone="primary"
        active={filter === "pending"}
        onClick={() => set("pending")}
      />
      <StatCard
        icon={CalendarDays}
        label="今天截止"
        value={dueToday}
        tone={dueToday > 0 ? "warning" : "primary"}
        active={filter === "today"}
        onClick={() => set("today")}
      />
      <StatCard
        icon={AlertCircle}
        label="已逾期"
        value={overdue}
        tone={overdue > 0 ? "danger" : "primary"}
        active={filter === "overdue"}
        onClick={() => set("overdue")}
      />
      <StatCard
        icon={CheckCircle2}
        label="已完成"
        value={completed}
        tone="success"
        active={filter === "completed"}
        onClick={() => set("completed")}
      />
    </div>
  );
}
