/**
 * 番茄钟工具函数（纯函数，无副作用）
 */

import type {
  PomodoroPhase,
  PomodoroSession,
  PomodoroStats,
} from "./pomodoro-types";

// ── 时间格式化 ────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h} 小时 ${rm} 分钟` : `${h} 小时`;
}

// ── 统计计算 ──────────────────────────────────────────────────

export function computeStats(sessions: PomodoroSession[]): PomodoroStats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const todaySessions = sessions.filter(
    (s) => s.startedAt >= todayTs && s.phase === "focus"
  );
  const todayFocus = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  let streak = 0;
  if (todaySessions.length > 0) {
    streak = 1;
    const checkDate = new Date(todayStart);
    checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const daySessions = sessions.filter(
        (s) =>
          s.startedAt >= dayStart.getTime() &&
          s.startedAt < dayEnd.getTime() &&
          s.phase === "focus"
      );
      if (daySessions.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
  }

  return { todayFocus, todaySessions: todaySessions.length, streak };
}

// ── 主题辅助 ──────────────────────────────────────────────────

export const phaseColorClass = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "text-[#3fb950]"
      : "text-green-600"
    : "text-primary";

export const phaseBgClass = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "bg-[#3fb950]"
      : "bg-green-600"
    : "bg-primary";

export const phaseStrokeColor = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "#3fb950"
      : "#16a34a"
    : isDark
      ? "#8b9cf7"
      : "hsl(var(--primary))";
