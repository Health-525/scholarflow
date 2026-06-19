import type { Assignment } from "@/types";

export function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function dateToDeadline(date: string): string {
  return `${date}T23:59`;
}

export function classifyAssignment(
  a: Assignment,
  now: number
): "overdue" | "today" | "future" | "done" {
  if (a.done) return "done";
  if (!a.deadline) return "future";
  const ms = new Date(a.deadline).getTime() - now;
  if (ms < 0) return "overdue";
  if (ms < 86400000) return "today";
  return "future";
}

export function daysUntil(a: Assignment, now: number): number | null {
  if (!a.deadline || a.done) return null;
  const ms = new Date(a.deadline).getTime() - now;
  if (ms < 0) return null;
  return Math.ceil(ms / 86400000);
}

export function formatDateLabel(d = new Date()): string {
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
}

export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export type Filter = "all" | "pending" | "today" | "overdue" | "completed";
export type Tone = "primary" | "success" | "warning" | "danger";

export const TONE_STYLES: Record<Tone, { bg: string; color: string }> = {
  primary: {
    bg: "rgba(var(--primary-rgb), 0.1)",
    color: "var(--primary)",
  },
  success: {
    bg: "rgba(var(--status-success-rgb), 0.1)",
    color: "var(--status-success)",
  },
  warning: {
    bg: "rgba(var(--status-warning-rgb), 0.1)",
    color: "var(--status-warning)",
  },
  danger: {
    bg: "rgba(var(--status-error-rgb), 0.1)",
    color: "var(--status-error)",
  },
};
