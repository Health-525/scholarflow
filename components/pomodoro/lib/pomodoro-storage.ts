/**
 * 番茄钟 localStorage 持久化（副作用隔离）
 */

import type {
  PomodoroPhase,
  PomodoroSettings,
  PomodoroSession,
  PomodoroState,
  PersistedTimerState,
} from "./pomodoro-types";
import { DEFAULT_SETTINGS as DEFAULTS } from "./pomodoro-types";

const LS_SESSIONS_KEY = "sf_pomodoro_sessions";
const LS_SETTINGS_KEY = "sf_pomodoro_settings";
const LS_TIMER_STATE_KEY = "sf_pomodoro_timer_state";

// ── Settings ─────────────────────────────────────────────────

export function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

export function saveSettings(s: PomodoroSettings): void {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ── Sessions ─────────────────────────────────────────────────

export function loadSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveSessions(sessions: PomodoroSession[]): void {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter((s) => s.startedAt > cutoff);
  try {
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(recent));
  } catch {
    /* ignore */
  }
}

// ── Timer state ───────────────────────────────────────────────

export function persistTimerState(state: PomodoroState): void {
  if (state.phase === "idle") {
    try {
      localStorage.removeItem(LS_TIMER_STATE_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  const ts: PersistedTimerState = {
    phase: state.phase,
    remaining: state.remaining,
    total: state.total,
    completedFocus: state.completedFocus,
    isRunning: state.isRunning,
    startedAt: Date.now() - (state.total - state.remaining) * 1000,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(LS_TIMER_STATE_KEY, JSON.stringify(ts));
  } catch {
    /* ignore */
  }
}

export function restoreTimerState(_settings: PomodoroSettings): {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  completedFocus: number;
  isRunning: boolean;
  targetEndAt: number | null;
} | null {
  try {
    const raw = localStorage.getItem(LS_TIMER_STATE_KEY);
    if (!raw) return null;
    const ts: PersistedTimerState = JSON.parse(raw);

    if (ts.isRunning) {
      const elapsed = Math.floor((Date.now() - ts.savedAt) / 1000);
      const newRemaining = ts.remaining - elapsed;
      if (newRemaining <= 0) {
        localStorage.removeItem(LS_TIMER_STATE_KEY);
        return null;
      }
      return {
        phase: ts.phase,
        remaining: newRemaining,
        total: ts.total,
        completedFocus: ts.completedFocus,
        isRunning: true,
        targetEndAt: Date.now() + newRemaining * 1000,
      };
    }

    if (ts.phase !== "idle") {
      return {
        phase: ts.phase,
        remaining: ts.remaining,
        total: ts.total,
        completedFocus: ts.completedFocus,
        isRunning: false,
        targetEndAt: null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
