"use client";

import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Settings2,
  Bell,
  Flame,
  Clock,
  Hourglass,
} from "lucide-react";
import { useReducer, useEffect, useRef, useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  targetEndAt: number | null;
  settings: PomodoroSettings;
  completedFocus: number;
  isRunning: boolean;
  showSettings: boolean;
  sessions: PomodoroSession[];
  stats: { todayFocus: number; todaySessions: number; streak: number };
  lastCompletedPhase: PomodoroPhase | null;
}

type PomodoroAction =
  | { type: "START"; phase: PomodoroPhase; duration: number; now: number }
  | { type: "TICK"; now: number }
  | { type: "PAUSE" }
  | { type: "RESUME"; now: number }
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
  startedAt: number; // Date.now() when timer was started/resumed
  savedAt: number; // Date.now() when state was persisted
}

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: PomodoroSettings) {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function loadSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveSessions(sessions: PomodoroSession[]) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter((s) => s.startedAt > cutoff);
  try {
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(recent));
  } catch {
    /* ignore */
  }
}

function persistTimerState(state: PomodoroState) {
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

function restoreTimerState(_settings: PomodoroSettings): {
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
        targetEndAt: Date.now() + newRemaining * 1000,
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
        targetEndAt: null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function computeStats(sessions: PomodoroSession[]): PomodoroState["stats"] {
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

// ── Reducer (pure — no side effects) ───────────────────────
function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
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

        const newStats = computeStats(newSessions);

        return {
          ...state,
          isRunning: false, // Don't auto-start — let user explicitly begin
          phase: nextPhase,
          total: nextDuration,
          remaining: nextDuration,
          targetEndAt: null,
          completedFocus: nextCompletedFocus,
          sessions: newSessions,
          stats: newStats,
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

// ── Phase helpers ──────────────────────────────────────────
const phaseColorClass = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "text-[#3fb950]"
      : "text-green-600"
    : "text-primary";

const phaseBgClass = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "bg-[#3fb950]"
      : "bg-green-600"
    : "bg-primary";

const phaseStrokeColor = (phase: PomodoroPhase, isDark?: boolean) =>
  phase === "break" || phase === "longBreak"
    ? isDark
      ? "#3fb950"
      : "#16a34a"
    : isDark
      ? "#8b9cf7"
      : "hsl(var(--primary))";

const phaseLabel: Record<PomodoroPhase, string> = {
  idle: "准备专注",
  focus: "专注中",
  break: "休息中",
  longBreak: "长休息",
};

// ── Inner Component (receives initial data from localStorage) ──
function PomodoroTimerInner({
  initialSettings,
  initialSessions,
}: {
  initialSettings: PomodoroSettings;
  initialSessions: PomodoroSession[];
}) {
  // Restore persisted timer state if available
  const restored = restoreTimerState(initialSettings);
  const [isDark, setIsDark] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [state, dispatch] = useReducer(pomodoroReducer, {
    phase: restored?.phase ?? ("idle" as PomodoroPhase),
    remaining: restored?.remaining ?? initialSettings.focusMinutes * 60,
    total: restored?.total ?? initialSettings.focusMinutes * 60,
    targetEndAt: restored?.targetEndAt ?? null,
    settings: initialSettings,
    completedFocus: restored?.completedFocus ?? 0,
    isRunning: restored?.isRunning ?? false,
    showSettings: false,
    sessions: initialSessions,
    stats: computeStats(initialSessions),
    lastCompletedPhase: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPersistedRef = useRef(0);
  const stateRef = useRef(state);

  // Keep stateRef in sync with the latest state for event handlers
  useEffect(() => {
    stateRef.current = state;
  });

  // Detect dark mode
  useEffect(() => {
    const check = () => {
      setIsDark(
        document.documentElement.getAttribute("data-theme") === "dark" ||
          (document.documentElement.getAttribute("data-theme") !== "light" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  // Detect reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist settings changes in an effect (keeps reducer pure)
  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  // Start/stop interval based on isRunning; tick uses Date.now() diff for accuracy
  useEffect(() => {
    if (state.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        dispatch({ type: "TICK", now: Date.now() });
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

  // Persist timer state on changes (only relevant fields, not entire state).
  // Throttle to at most once every 5 seconds while running to avoid blocking
  // the main thread with localStorage writes every tick.
  useEffect(() => {
    const now = Date.now();
    const throttled = state.isRunning && now - lastPersistedRef.current < 5000;
    if (throttled) return;

    persistTimerState(state);
    lastPersistedRef.current = now;
  }, [state]);

  // Always persist before the page unloads so users don't lose the last seconds.
  // stateRef 保证读取最新 state，因此不需要将 state 加入依赖数组。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleBeforeUnload = () => persistTimerState(stateRef.current);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Side effects on phase completion (moved out of reducer)
  useEffect(() => {
    if (state.lastCompletedPhase) {
      saveSessions(state.sessions);
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(
          state.lastCompletedPhase === "focus" ? "🍅 专注完成！" : "☕ 休息结束！",
          {
            body:
              state.lastCompletedPhase === "focus" ? "休息一下吧" : "继续专注",
          }
        );
      }
      dispatch({ type: "CLEAR_COMPLETED_PHASE" });
    }
  }, [state.lastCompletedPhase, state.sessions]);

  const startPhase = useCallback(
    (phase: PomodoroPhase) => {
      const duration =
        phase === "focus"
          ? state.settings.focusMinutes * 60
          : phase === "break"
            ? state.settings.breakMinutes * 60
            : state.settings.longBreakMinutes * 60;
      dispatch({ type: "START", phase, duration, now: Date.now() });
    },
    [state.settings]
  );

  const togglePause = useCallback(() => {
    if (state.phase === "idle") {
      startPhase("focus");
    } else if (state.isRunning) {
      dispatch({ type: "PAUSE" });
    } else {
      dispatch({ type: "RESUME", now: Date.now() });
    }
  }, [state.phase, state.isRunning, startPhase]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const progress =
    state.phase === "idle" ? 0 : ((state.total - state.remaining) / state.total) * 100;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const updateSettings = useCallback(
    (key: keyof PomodoroSettings, value: number) => {
      dispatch({ type: "UPDATE_SETTINGS", key, value });
    },
    []
  );

  return (
    <div className="pb-24 md:pb-0">
      {/* Timer circle */}
      <div
        className={`flex flex-col items-center mb-6 ${
          !prefersReducedMotion ? "animate-fade-up" : ""
        }`}
      >
        <div className="relative">
          {/* Glow effect when running */}
          {state.isRunning && (
            <div
              className={`absolute inset-0 rounded-full opacity-30 ${
                !prefersReducedMotion ? "animate-breathe" : ""
              }`}
              style={{
                background: `radial-gradient(circle, ${phaseStrokeColor(state.phase, isDark)}20 0%, transparent 70%)`,
                transform: "scale(1.1)",
              }}
            />
          )}
          <svg
            viewBox="0 0 260 260"
            className="w-[clamp(220px,60vw,260px)] h-[clamp(220px,60vw,260px)]"
          >
            {/* Background track */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border"
            />
            {/* Progress arc */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke={phaseStrokeColor(state.phase, isDark)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 130 130)"
              style={{
                transition: prefersReducedMotion ? undefined : "stroke-dashoffset 1s linear",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-[42px] font-bold tabular-nums font-display ${
                phaseColorClass(state.phase, isDark)
              } ${state.isRunning && !prefersReducedMotion ? "animate-breathe" : ""}`}
            >
              {formatTime(state.remaining)}
            </span>
            <span className="text-[11px] mt-1 text-muted-foreground">
              {phaseLabel[state.phase]}
            </span>
            {state.phase !== "idle" && (
              <span className="text-[11px] mt-0.5 text-muted-foreground/60">
                {state.phase === "focus"
                  ? `${state.settings.focusMinutes}分钟`
                  : state.phase === "break"
                    ? `${state.settings.breakMinutes}分钟`
                    : `${state.settings.longBreakMinutes}分钟`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          title="重置"
          aria-label="重置"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="icon-lg"
          className={`w-14 h-14 rounded-2xl ${phaseBgClass(state.phase, isDark)}`}
          onClick={togglePause}
          aria-label={state.phase === "idle" || !state.isRunning ? "开始" : "暂停"}
        >
          {state.phase === "idle" || !state.isRunning ? (
            <Play className="w-6 h-6 ml-0.5" />
          ) : (
            <Pause className="w-6 h-6" />
          )}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          title="设置"
          aria-label="设置"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Session indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: state.settings.longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < state.completedFocus % state.settings.longBreakInterval
                ? "bg-primary"
                : i === state.completedFocus % state.settings.longBreakInterval &&
                    state.phase === "focus"
                  ? "bg-primary/20"
                  : "bg-border"
            }`}
          />
        ))}
        <span className="text-[11px] ml-1 text-muted-foreground">
          第 {state.completedFocus + 1} 轮
        </span>
      </div>

      {/* Settings panel */}
      {state.showSettings && (
        <Card
          className={`mb-6 hover:translate-y-0 hover:shadow-sm ${
            !prefersReducedMotion ? "animate-fade-up" : ""
          }`}
        >
          <CardHeader>
            <CardTitle className="text-[13px]">时间设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SettingRow
                label="专注"
                icon={<Brain className="w-3.5 h-3.5 text-primary" />}
                value={state.settings.focusMinutes}
                onChange={(v) => updateSettings("focusMinutes", v)}
                min={1}
                max={60}
              />
              <SettingRow
                label="短休息"
                icon={<Coffee className="w-3.5 h-3.5 text-green-600" />}
                value={state.settings.breakMinutes}
                onChange={(v) => updateSettings("breakMinutes", v)}
                min={1}
                max={30}
              />
              <SettingRow
                label="长休息"
                icon={<Hourglass className="w-3.5 h-3.5 text-green-600" />}
                value={state.settings.longBreakMinutes}
                onChange={(v) => updateSettings("longBreakMinutes", v)}
                min={5}
                max={45}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's stats */}
      <Card className="hover:translate-y-0 hover:shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-[13px]">
            <span>今日统计</span>
            {state.stats.streak > 0 && (
              <Badge variant="default" className="text-[11px]">
                <Flame className="w-3 h-3 mr-1" />
                连续 {state.stats.streak} 天
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
              <div
                className={`text-xl font-bold tabular-nums font-display text-primary ${
                  !prefersReducedMotion ? "animate-count" : ""
                }`}
              >
                {state.stats.todaySessions}
              </div>
              <div className="text-[11px] mt-0.5 text-muted-foreground">专注次数</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
              <div
                className={`text-xl font-bold tabular-nums font-display text-primary ${
                  !prefersReducedMotion ? "animate-count" : ""
                }`}
              >
                {formatMinutes(state.stats.todayFocus)}
              </div>
              <div className="text-[11px] mt-0.5 text-muted-foreground">专注时长</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-secondary border border-border">
              <div
                className={`text-xl font-bold tabular-nums font-display text-foreground ${
                  !prefersReducedMotion ? "animate-count" : ""
                }`}
              >
                {state.completedFocus}
              </div>
              <div className="text-[11px] mt-0.5 text-muted-foreground">本轮完成</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification permission */}
      {typeof Notification !== "undefined" && Notification.permission === "default" && (
        <Card className="mt-3 hover:translate-y-0 hover:shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Bell className="w-3.5 h-3.5 text-primary" />
              开启通知提醒，番茄钟结束时通知你
            </div>
            <Button
              size="sm"
              onClick={() => Notification.requestPermission()}
            >
              开启
            </Button>
          </CardContent>
        </Card>
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
      <div className="pb-24 md:pb-0 space-y-6">
        <div className="flex flex-col items-center mb-6">
          <Skeleton className="w-[clamp(220px,60vw,260px)] h-[clamp(220px,60vw,260px)] rounded-full" />
        </div>
        <div className="flex items-center justify-center gap-4 mb-6">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
        <Card className="hover:translate-y-0 hover:shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PomodoroTimerInner initialSettings={initialData.settings} initialSessions={initialData.sessions} />;
}

// ── Sub-components ─────────────────────────────────────────
function SettingRow({
  label,
  icon,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return;
            const n = parseInt(raw, 10);
            if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          className="w-16 h-8 text-center text-[13px] tabular-nums"
        />
        <span className="text-[12px] text-muted-foreground">分钟</span>
      </div>
    </div>
  );
}
