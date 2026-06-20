/**
 * 番茄钟 reducer（纯函数，无副作用，可独立单测）
 */

import type {
  PomodoroAction,
  PomodoroPhase,
  PomodoroSession,
  PomodoroState,
} from "./pomodoro-types";
import { computeStats } from "./pomodoro-utils";

export function pomodoroReducer(
  state: PomodoroState,
  action: PomodoroAction
): PomodoroState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: action.phase,
        total: action.duration,
        remaining: action.duration,
        targetEndAt: action.now + action.duration * 1000,
        isRunning: true,
        lastCompletedPhase: null,
      };

    case "TICK": {
      if (state.targetEndAt == null) return state;
      const remainingMs = state.targetEndAt - action.now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec === 0) {
        const elapsed = state.total;
        const newSession: PomodoroSession = {
          startedAt: action.now - elapsed * 1000,
          duration: elapsed,
          phase: state.phase,
        };
        const newSessions = [...state.sessions, newSession];

        let nextPhase: PomodoroPhase;
        let nextCompletedFocus = state.completedFocus;

        if (state.phase === "focus") {
          nextCompletedFocus = state.completedFocus + 1;
          nextPhase =
            nextCompletedFocus % state.settings.longBreakInterval === 0
              ? "longBreak"
              : "break";
        } else {
          nextPhase = "focus";
        }

        const nextDuration =
          nextPhase === "focus"
            ? state.settings.focusMinutes * 60
            : nextPhase === "break"
              ? state.settings.breakMinutes * 60
              : state.settings.longBreakMinutes * 60;

        return {
          ...state,
          isRunning: false,
          phase: nextPhase,
          total: nextDuration,
          remaining: nextDuration,
          targetEndAt: null,
          completedFocus: nextCompletedFocus,
          sessions: newSessions,
          stats: computeStats(newSessions),
          lastCompletedPhase: state.phase,
        };
      }
      return { ...state, remaining: remainingSec };
    }

    case "PAUSE":
      return { ...state, isRunning: false, targetEndAt: null };

    case "RESUME":
      return {
        ...state,
        isRunning: true,
        targetEndAt: action.now + state.remaining * 1000,
      };

    case "RESET":
      return {
        ...state,
        phase: "idle",
        remaining: state.settings.focusMinutes * 60,
        total: state.settings.focusMinutes * 60,
        targetEndAt: null,
        isRunning: false,
        completedFocus: 0,
        lastCompletedPhase: null,
      };

    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings };

    case "UPDATE_SETTINGS": {
      const next = { ...state.settings, [action.key]: action.value };
      if (state.phase === "idle") {
        return {
          ...state,
          settings: next,
          remaining: next.focusMinutes * 60,
          total: next.focusMinutes * 60,
        };
      }
      return { ...state, settings: next };
    }

    case "CLEAR_COMPLETED_PHASE":
      return { ...state, lastCompletedPhase: null };

    default:
      return state;
  }
}
