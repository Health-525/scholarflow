// ── 类型定义（纯数据，无 React 依赖） ──────────────────────────

export type PomodoroPhase = "focus" | "break" | "longBreak" | "idle";

export interface PomodoroSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

export interface PomodoroSession {
  startedAt: number;
  duration: number; // seconds
  phase: PomodoroPhase;
}

export interface PomodoroStats {
  todayFocus: number;
  todaySessions: number;
  streak: number;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  targetEndAt: number | null;
  settings: PomodoroSettings;
  completedFocus: number;
  isRunning: boolean;
  showSettings: boolean;
  sessions: PomodoroSession[];
  stats: PomodoroStats;
  lastCompletedPhase: PomodoroPhase | null;
}

export type PomodoroAction =
  | { type: "START"; phase: PomodoroPhase; duration: number; now: number }
  | { type: "TICK"; now: number }
  | { type: "PAUSE" }
  | { type: "RESUME"; now: number }
  | { type: "RESET" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; key: keyof PomodoroSettings; value: number }
  | { type: "CLEAR_COMPLETED_PHASE" };

export interface PersistedTimerState {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  completedFocus: number;
  isRunning: boolean;
  startedAt: number;
  savedAt: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

export const phaseLabel: Record<PomodoroPhase, string> = {
  idle: "准备专注",
  focus: "专注中",
  break: "休息中",
  longBreak: "长休息",
};
