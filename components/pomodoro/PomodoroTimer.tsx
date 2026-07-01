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
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { pomodoroReducer } from "./lib/pomodoro-reducer";
import {
  loadSettings,
  loadSessions,
  saveSettings,
  saveSessions,
  persistTimerState,
  restoreTimerState,
} from "./lib/pomodoro-storage";
import { phaseLabel } from "./lib/pomodoro-types";
import type { PomodoroPhase, PomodoroSettings } from "./lib/pomodoro-types";
import {
  formatTime,
  formatMinutes,
  computeStats,
  phaseColorClass,
  phaseBgClass,
  phaseStrokeColor,
} from "./lib/pomodoro-utils";

// ── 深色模式检测 ──────────────────────────────────────────────

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
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
  return isDark;
}

// ── SettingRow ────────────────────────────────────────────────

function SettingRow({
  label,
  htmlFor,
  icon,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  htmlFor: string;
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
        <label htmlFor={htmlFor} className="text-[11px] font-semibold text-[#8F959E] uppercase tracking-wider">
          {label}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <Input
          id={htmlFor}
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
          className="w-16 h-8 text-center text-sm tabular-nums"
        />
        <span className="text-xs text-muted-foreground">分钟</span>
      </div>
    </div>
  );
}

// ── Inner Component ───────────────────────────────────────────

function PomodoroTimerInner({
  initialSettings,
  initialSessions,
}: {
  initialSettings: PomodoroSettings;
  initialSessions: ReturnType<typeof loadSessions>;
}) {
  const restored = restoreTimerState(initialSettings);
  const isDark = useIsDark();
  const prefersReducedMotion = usePrefersReducedMotion();

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

  useEffect(() => {
    stateRef.current = state;
  });

  // Persist settings
  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  // Tick interval
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

  // Throttled persist (max once per 5s while running)
  useEffect(() => {
    const now = Date.now();
    const throttled = state.isRunning && now - lastPersistedRef.current < 5000;
    if (throttled) return;
    persistTimerState(state);
    lastPersistedRef.current = now;
  }, [state]);

  // Persist on unload
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handle = () => persistTimerState(stateRef.current);
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, []);

  // Phase completion side-effects
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

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const updateSettings = useCallback(
    (key: keyof PomodoroSettings, value: number) => {
      dispatch({ type: "UPDATE_SETTINGS", key, value });
    },
    []
  );

  // Esc 关闭设置面板
  useEffect(() => {
    if (!state.showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "TOGGLE_SETTINGS" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.showSettings]);

  const progress =
    state.phase === "idle"
      ? 0
      : ((state.total - state.remaining) / state.total) * 100;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="pb-24 md:pb-0">
      {/* Timer circle */}
      <div
        className={`bg-card rounded-3xl p-8 shadow-sm border border-border flex flex-col items-center mb-6 ${
          !prefersReducedMotion ? "animate-fade-up" : ""
        }`}
      >
        <div className="relative">
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
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border"
            />
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
                transition: prefersReducedMotion
                  ? undefined
                  : "stroke-dashoffset 1s linear",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-7xl md:text-8xl font-black tabular-nums tracking-tighter select-none ${phaseColorClass(state.phase, isDark)} ${
                state.isRunning && !prefersReducedMotion ? "animate-breathe" : ""
              }`}
            >
              {formatTime(state.remaining)}
            </span>
            <span className="text-xs mt-1 text-muted-foreground">
              {phaseLabel[state.phase]}
            </span>
            {state.phase !== "idle" && (
              <span className="text-xs mt-0.5 text-muted-foreground/60">
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
          className={`w-14 h-14 rounded-2xl active:scale-95 transition-transform duration-150 ${phaseBgClass(state.phase, isDark)}`}
          onClick={togglePause}
          aria-label={
            state.phase === "idle" || !state.isRunning ? "开始" : "暂停"
          }
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
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < state.completedFocus % state.settings.longBreakInterval
                ? "bg-primary shadow-[0_0_6px_rgba(51,112,255,0.3)]"
                : i ===
                      state.completedFocus %
                        state.settings.longBreakInterval &&
                    state.phase === "focus"
                  ? "bg-primary/30 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "bg-muted"
            }`}
          />
        ))}
        <span className="text-xs ml-1 text-muted-foreground">
          第 {state.completedFocus + 1} 轮
        </span>
      </div>

      {/* Settings panel */}
      {state.showSettings && (
        <Card
          role="region"
          aria-label="番茄钟时间设置"
          className={`mb-6 ${
            !prefersReducedMotion ? "animate-fade-up" : ""
          }`}
        >
          <CardHeader>
            <CardTitle className="text-sm">时间设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SettingRow
                label="专注"
                htmlFor="pomodoro-focus-minutes"
                icon={<Brain className="w-3.5 h-3.5 text-primary" />}
                value={state.settings.focusMinutes}
                onChange={(v) => updateSettings("focusMinutes", v)}
                min={1}
                max={60}
              />
              <SettingRow
                label="短休息"
                htmlFor="pomodoro-break-minutes"
                icon={<Coffee className="w-3.5 h-3.5 text-statusSuccess" />}
                value={state.settings.breakMinutes}
                onChange={(v) => updateSettings("breakMinutes", v)}
                min={1}
                max={30}
              />
              <SettingRow
                label="长休息"
                htmlFor="pomodoro-long-break-minutes"
                icon={<Hourglass className="w-3.5 h-3.5 text-statusSuccess" />}
                value={state.settings.longBreakMinutes}
                onChange={(v) => updateSettings("longBreakMinutes", v)}
                min={5}
                max={45}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>今日统计</span>
            {state.stats.streak > 0 && (
              <Badge variant="default" className="text-xs">
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
              <div className="text-xs mt-0.5 text-muted-foreground">
                专注次数
              </div>
            </div>
            <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
              <div
                className={`text-xl font-bold tabular-nums font-display text-primary ${
                  !prefersReducedMotion ? "animate-count" : ""
                }`}
              >
                {formatMinutes(state.stats.todayFocus)}
              </div>
              <div className="text-xs mt-0.5 text-muted-foreground">
                专注时长
              </div>
            </div>
            <div className="rounded-xl p-3 text-center bg-primary/5 border border-primary/10">
              <div
                className={`text-xl font-bold tabular-nums font-display text-foreground ${
                  !prefersReducedMotion ? "animate-count" : ""
                }`}
              >
                {state.completedFocus}
              </div>
              <div className="text-xs mt-0.5 text-muted-foreground">
                本轮完成
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification permission */}
      {typeof Notification !== "undefined" &&
        Notification.permission === "default" && (
          <Card className="mt-3">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

// ── Outer Component (hydration-safe) ─────────────────────────

export function PomodoroTimer() {
  const [mounted, setMounted] = useState(false);
  const [initialData, setInitialData] = useState<{
    settings: PomodoroSettings;
    sessions: ReturnType<typeof loadSessions>;
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
        <Card>
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

  return (
    <PomodoroTimerInner
      initialSettings={initialData.settings}
      initialSessions={initialData.sessions}
    />
  );
}
