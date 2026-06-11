"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type PomodoroPhase = "focus" | "break" | "longBreak" | "idle";

interface PomodoroSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

interface PomodoroSession {
  startedAt: number;
  duration: number; // seconds
  phase: PomodoroPhase;
}

interface PomodoroState {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  settings: PomodoroSettings;
  completedFocus: number;
  isRunning: boolean;
  showSettings: boolean;
  sessions: PomodoroSession[];
  stats: { todayFocus: number; todaySessions: number; streak: number };
  lastCompletedPhase: PomodoroPhase | null;
}

type PomodoroAction =
  | { type: "START"; phase: PomodoroPhase; duration: number }
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; key: keyof PomodoroSettings; value: number }
  | { type: "CLEAR_COMPLETED_PHASE" };

// ── Config ─────────────────────────────────────────────────
const LS_SESSIONS_KEY = "sf_pomodoro_sessions";
const LS_SETTINGS_KEY = "sf_pomodoro_settings";
const LS_TIMER_STATE_KEY = "sf_pomodoro_timer_state";

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

interface PersistedTimerState {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  completedFocus: number;
  isRunning: boolean;
  startedAt: number;   // Date.now() when timer was started/resumed
  savedAt: number;     // Date.now() when state was persisted
}

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: PomodoroSettings) {
  try { localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function loadSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions: PomodoroSession[]) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(s => s.startedAt > cutoff);
  try { localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(recent)); } catch { /* ignore */ }
}

function persistTimerState(state: PomodoroState) {
  if (state.phase === "idle") {
    try { localStorage.removeItem(LS_TIMER_STATE_KEY); } catch { /* ignore */ }
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
  try { localStorage.setItem(LS_TIMER_STATE_KEY, JSON.stringify(ts)); } catch { /* ignore */ }
}

function restoreTimerState(settings: PomodoroSettings): {
  phase: PomodoroPhase;
  remaining: number;
  total: number;
  completedFocus: number;
  isRunning: boolean;
} | null {
  try {
    const raw = localStorage.getItem(LS_TIMER_STATE_KEY);
    if (!raw) return null;
    const ts: PersistedTimerState = JSON.parse(raw);
    // If timer was running, account for elapsed time since savedAt
    if (ts.isRunning) {
      const elapsed = Math.floor((Date.now() - ts.savedAt) / 1000);
      const newRemaining = ts.remaining - elapsed;
      if (newRemaining <= 0) {
        // Timer would have completed while away — clear persisted state
        localStorage.removeItem(LS_TIMER_STATE_KEY);
        return null;
      }
      return {
        phase: ts.phase,
        remaining: newRemaining,
        total: ts.total,
        completedFocus: ts.completedFocus,
        isRunning: true,
      };
    }
    // Paused timer — restore as-is
    if (ts.phase !== "idle") {
      return {
        phase: ts.phase,
        remaining: ts.remaining,
        total: ts.total,
        completedFocus: ts.completedFocus,
        isRunning: false,
      };
    }
  } catch { /* ignore */ }
  return null;
}

function computeStats(sessions: PomodoroSession[]): PomodoroState["stats"] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const todaySessions = sessions.filter(s => s.startedAt >= todayTs && s.phase === "focus");
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
        s => s.startedAt >= dayStart.getTime() && s.startedAt < dayEnd.getTime() && s.phase === "focus"
      );
      if (daySessions.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
  }

  return { todayFocus, todaySessions: todaySessions.length, streak };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h} 小时 ${rm} 分钟` : `${h} 小时`;
}

// ── Reducer (pure — no side effects except saveSettings which is idempotent) ─
function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: action.phase,
        total: action.duration,
        remaining: action.duration,
        isRunning: true,
        lastCompletedPhase: null,
      };

    case "TICK":
      if (state.remaining <= 1) {
        const elapsed = state.total;
        const newSession: PomodoroSession = {
          startedAt: Date.now() - elapsed * 1000,
          duration: elapsed,
          phase: state.phase,
        };
        const newSessions = [...state.sessions, newSession];

        let nextPhase: PomodoroPhase;
        let nextCompletedFocus = state.completedFocus;

        if (state.phase === "focus") {
          nextCompletedFocus = state.completedFocus + 1;
          nextPhase = nextCompletedFocus % state.settings.longBreakInterval === 0 ? "longBreak" : "break";
        } else {
          nextPhase = "focus";
        }

        const nextDuration =
          nextPhase === "focus" ? state.settings.focusMinutes * 60 :
          nextPhase === "break" ? state.settings.breakMinutes * 60 :
          state.settings.longBreakMinutes * 60;

        const newStats = computeStats(newSessions);

        return {
          ...state,
          isRunning: false, // Don't auto-start — let user explicitly begin
          phase: nextPhase,
          total: nextDuration,
          remaining: nextDuration,
          completedFocus: nextCompletedFocus,
          sessions: newSessions,
          stats: newStats,
          lastCompletedPhase: state.phase,
        };
      }
      return { ...state, remaining: state.remaining - 1 };

    case "PAUSE":
      return { ...state, isRunning: false };

    case "RESUME":
      return { ...state, isRunning: true };

    case "RESET":
      return {
        ...state,
        phase: "idle",
        remaining: state.settings.focusMinutes * 60,
        total: state.settings.focusMinutes * 60,
        isRunning: false,
        completedFocus: 0,
        lastCompletedPhase: null,
      };

    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings };

    case "UPDATE_SETTINGS": {
      const next = { ...state.settings, [action.key]: action.value };
      saveSettings(next);
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

// ── Phase helpers ──────────────────────────────────────────
const phaseColorClass = (phase: PomodoroPhase) =>
  phase === "break" || phase === "longBreak" ? "text-green-600" : "text-primary";

const phaseBgClass = (phase: PomodoroPhase) =>
  phase === "break" || phase === "longBreak" ? "bg-green-600" : "bg-primary";

const phaseStrokeColor = (phase: PomodoroPhase) =>
  phase === "break" || phase === "longBreak" ? "#16a34a" : "hsl(var(--primary))";

const phaseLabel: Record<PomodoroPhase, string> = {
  idle: "准备专注",
  focus: "专注中",
  break: "休息中",
  longBreak: "长休息",
};

// ── Inner Component (receives initial data from localStorage) ──
function PomodoroTimerInner({ initialSettings, initialSessions }: {
  initialSettings: PomodoroSettings;
  initialSessions: PomodoroSession[];
}) {
  // Restore persisted timer state if available
  const restored = restoreTimerState(initialSettings);
  const [state, dispatch] = useReducer(pomodoroReducer, {
    phase: restored?.phase ?? ("idle" as PomodoroPhase),
    remaining: restored?.remaining ?? initialSettings.focusMinutes * 60,
    total: restored?.total ?? initialSettings.focusMinutes * 60,
    settings: initialSettings,
    completedFocus: restored?.completedFocus ?? 0,
    isRunning: restored?.isRunning ?? false,
    showSettings: false,
    sessions: initialSessions,
    stats: computeStats(initialSessions),
    lastCompletedPhase: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop interval based on isRunning
  useEffect(() => {
    if (state.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        dispatch({ type: "TICK" });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isRunning]);

  // Persist timer state on changes (only relevant fields, not entire state)
  useEffect(() => {
    persistTimerState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.remaining, state.total, state.completedFocus, state.isRunning]);

  // Side effects on phase completion (moved out of reducer)
  useEffect(() => {
    if (state.lastCompletedPhase) {
      saveSessions(state.sessions);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(state.lastCompletedPhase === "focus" ? "🍅 专注完成！" : "☕ 休息结束！", {
          body: state.lastCompletedPhase === "focus" ? "休息一下吧" : "继续专注",
        });
      }
      dispatch({ type: "CLEAR_COMPLETED_PHASE" });
    }
  }, [state.lastCompletedPhase, state.sessions]);

  const startPhase = useCallback((phase: PomodoroPhase) => {
    const duration =
      phase === "focus" ? state.settings.focusMinutes * 60 :
      phase === "break" ? state.settings.breakMinutes * 60 :
      state.settings.longBreakMinutes * 60;
    dispatch({ type: "START", phase, duration });
  }, [state.settings]);

  const togglePause = useCallback(() => {
    if (state.phase === "idle") {
      startPhase("focus");
    } else if (state.isRunning) {
      dispatch({ type: "PAUSE" });
    } else {
      dispatch({ type: "RESUME" });
    }
  }, [state.phase, state.isRunning, startPhase]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const progress = state.phase === "idle" ? 0 : ((state.total - state.remaining) / state.total) * 100;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const updateSettings = useCallback((key: keyof PomodoroSettings, value: number) => {
    dispatch({ type: "UPDATE_SETTINGS", key, value });
  }, []);

  return (
    <div className="pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold font-display text-foreground">番茄钟</h1>
        <p className="text-[12px] text-muted-foreground">
          {state.phase === "idle" ? `${state.settings.focusMinutes} 分钟专注 + ${state.settings.breakMinutes} 分钟休息` : phaseLabel[state.phase]}
        </p>
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-6 animate-fade-up">
        <div className="relative">
          {/* Glow effect when running */}
          {state.isRunning && (
            <div
              className="absolute inset-0 rounded-full animate-breathe opacity-30"
              style={{
                background: `radial-gradient(circle, ${phaseStrokeColor(state.phase)}20 0%, transparent 70%)`,
                transform: "scale(1.1)",
              }}
            />
          )}
          <svg width="260" height="260" viewBox="0 0 260 260">
            {/* Background track */}
            <circle cx="130" cy="130" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
            {/* Progress arc */}
            <circle
              cx="130" cy="130" r={radius}
              fill="none"
              stroke={phaseStrokeColor(state.phase)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 130 130)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
            {/* Inner decorative ring */}
            <circle cx="130" cy="130" r={radius - 16} fill="none" stroke="currentColor" strokeWidth="1" className="text-border/30" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[42px] font-bold tabular-nums font-display ${phaseColorClass(state.phase)} ${state.isRunning ? "animate-breathe" : ""}`}>
              {formatTime(state.remaining)}
            </span>
            <span className="text-[11px] mt-1 text-muted-foreground">{phaseLabel[state.phase]}</span>
            {state.phase !== "idle" && (
              <span className="text-[9px] mt-0.5 text-muted-foreground/60">
                {state.phase === "focus" ? `${state.settings.focusMinutes}分钟` : state.phase === "break" ? `${state.settings.breakMinutes}分钟` : `${state.settings.longBreakMinutes}分钟`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={reset} className="w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-card border border-border text-muted-foreground" title="重置">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={togglePause} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-primary-foreground ${phaseBgClass(state.phase)}`}>
          {state.phase === "idle" || !state.isRunning ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
        </button>
        <button onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })} className="w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-card border border-border text-muted-foreground" title="设置">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Session indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: state.settings.longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < state.completedFocus % state.settings.longBreakInterval
                ? "bg-primary"
                : i === state.completedFocus % state.settings.longBreakInterval && state.phase === "focus"
                  ? "bg-primary/20"
                  : "bg-border"
            }`}
          />
        ))}
        <span className="text-[10px] ml-1 text-muted-foreground">第 {state.completedFocus + 1} 轮</span>
      </div>

      {/* Settings panel */}
      {state.showSettings && (
        <div className="rounded-2xl p-4 mb-6 animate-fade-up border border-border bg-card">
          <h3 className="text-[12px] font-semibold mb-3 text-foreground">时间设置</h3>
          <div className="space-y-3">
            <SettingRow label="专注" icon={<Brain className="w-3.5 h-3.5 text-primary" />} value={state.settings.focusMinutes} onChange={v => updateSettings("focusMinutes", v)} min={1} max={60} />
            <SettingRow label="短休息" icon={<Coffee className="w-3.5 h-3.5 text-green-600" />} value={state.settings.breakMinutes} onChange={v => updateSettings("breakMinutes", v)} min={1} max={30} />
            <SettingRow label="长休息" icon={<Coffee className="w-3.5 h-3.5 text-green-600" />} value={state.settings.longBreakMinutes} onChange={v => updateSettings("longBreakMinutes", v)} min={5} max={45} />
          </div>
        </div>
      )}

      {/* Today's stats */}
      <div className="rounded-2xl p-5 border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-foreground">今日统计</h3>
          {state.stats.streak > 0 && (
            <span className="sf-chip sf-chip-accent">🔥 连续 {state.stats.streak} 天</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
            <div className="text-xl font-bold tabular-nums font-display text-primary animate-count">{state.stats.todaySessions}</div>
            <div className="text-[10px] mt-0.5 text-muted-foreground">专注次数</div>
          </div>
          <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
            <div className="text-xl font-bold tabular-nums font-display text-primary animate-count">{formatMinutes(state.stats.todayFocus)}</div>
            <div className="text-[10px] mt-0.5 text-muted-foreground">专注时长</div>
          </div>
          <div className="rounded-xl p-3 text-center bg-secondary border border-border">
            <div className="text-xl font-bold tabular-nums font-display text-foreground animate-count">{state.completedFocus}</div>
            <div className="text-[10px] mt-0.5 text-muted-foreground">本轮完成</div>
          </div>
        </div>
      </div>

      {/* Notification permission */}
      {typeof Notification !== "undefined" && Notification.permission === "default" && (
        <button onClick={() => Notification.requestPermission()} className="mt-3 w-full py-2.5 rounded-xl text-[11px] transition-colors bg-primary/10 text-primary">
          🔔 开启通知提醒（番茄钟结束时通知你）
        </button>
      )}
    </div>
  );
}

// ── Outer Component (handles hydration-safe mount) ──────────
export function PomodoroTimer() {
  const [mounted, setMounted] = useState(false);
  const [initialData, setInitialData] = useState<{
    settings: PomodoroSettings;
    sessions: PomodoroSession[];
  } | null>(null);

  useEffect(() => {
    const settings = loadSettings();
    const sessions = loadSessions();
    setInitialData({ settings, sessions });
    setMounted(true);
  }, []);

  if (!mounted || !initialData) {
    return (
      <div className="pb-24 md:pb-0">
        <div className="mb-6 py-4">
          <h1 className="text-lg font-bold font-display text-foreground">番茄钟</h1>
          <p className="text-[12px] text-muted-foreground">25 分钟专注 + 5 分钟休息</p>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="w-[260px] h-[260px] rounded-full bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  return <PomodoroTimerInner initialSettings={initialData.settings} initialSessions={initialData.sessions} />;
}

// ── Sub-components ─────────────────────────────────────────
function SettingRow({ label, icon, value, onChange, min, max }: {
  label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 5))} className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold bg-secondary border border-border text-muted-foreground">−</button>
        <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-foreground">{value}分</span>
        <button onClick={() => onChange(Math.min(max, value + 5))} className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold bg-secondary border border-border text-muted-foreground">+</button>
      </div>
    </div>
  );
}
