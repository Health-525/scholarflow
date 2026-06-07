"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2, ChevronDown } from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type PomodoroPhase = "focus" | "break" | "longBreak" | "idle";

interface PomodoroSession {
  startedAt: number;
  duration: number; // seconds
  phase: PomodoroPhase;
}

interface PomodoroStats {
  todayFocus: number;  // total focus seconds today
  todaySessions: number;
  streak: number;      // consecutive days with at least 1 focus session
}

// ── Config ─────────────────────────────────────────────────
const LS_SESSIONS_KEY = "sf_pomodoro_sessions";
const LS_SETTINGS_KEY = "sf_pomodoro_settings";
const LS_STREAK_KEY = "sf_pomodoro_streak";
const LS_DATE_KEY = "sf_pomodoro_date";

interface PomodoroSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // every N focus sessions
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

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
  // Keep only last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(s => s.startedAt > cutoff);
  try { localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(recent)); } catch { /* ignore */ }
}

function loadStats(): PomodoroStats {
  const sessions = loadSessions();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  const todaySessions = sessions.filter(s => s.startedAt >= todayTs && s.phase === "focus");
  const todayFocus = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  // Streak calculation
  let streak = 0;
  const checkDate = new Date(todayStart);
  // Check if today has sessions
  const todayHasSession = todaySessions.length > 0;

  if (todayHasSession) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
    // Go back day by day
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
      } else {
        break;
      }
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

// ── Component ──────────────────────────────────────────────
export function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [remaining, setRemaining] = useState(settings.focusMinutes * 60);
  const [total, setTotal] = useState(settings.focusMinutes * 60);
  const [sessions, setSessions] = useState<PomodoroSession[]>(loadSessions);
  const [stats, setStats] = useState<PomodoroStats>(loadStats);
  const [showSettings, setShowSettings] = useState(false);
  const [completedFocus, setCompletedFocus] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  // Use ref for startTimer to avoid circular dependency
  const startTimerRef = useRef<(p: PomodoroPhase) => void>(() => {});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Define startTimer as a ref so it can call itself without circular deps
  startTimerRef.current = (p: PomodoroPhase) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let duration: number;
    if (p === "focus") duration = settings.focusMinutes * 60;
    else if (p === "break") duration = settings.breakMinutes * 60;
    else duration = settings.longBreakMinutes * 60;

    setPhase(p);
    setTotal(duration);
    setRemaining(duration);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          // Timer complete
          if (timerRef.current) clearInterval(timerRef.current);

          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          const newSessions = [...sessions, {
            startedAt: startTimeRef.current,
            duration: elapsed,
            phase: p,
          }];
          setSessions(newSessions);
          saveSessions(newSessions);

          if (p === "focus") {
            const newCount = completedFocus + 1;
            setCompletedFocus(newCount);
            // Auto switch to break
            if (newCount % settings.longBreakInterval === 0) {
              startTimerRef.current("longBreak");
            } else {
              startTimerRef.current("break");
            }
          } else {
            // Break complete, go to focus
            startTimerRef.current("focus");
          }

          // Update stats
          setStats(loadStats());

          // Notification
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(p === "focus" ? "🍅 专注完成！" : "☕ 休息结束！", {
                body: p === "focus" ? "休息一下吧" : "继续专注",
              });
            }
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startTimer = useCallback((p: PomodoroPhase) => startTimerRef.current(p), []);

  const togglePause = () => {
    if (phase === "idle") {
      startTimer("focus");
    } else if (timerRef.current) {
      // Pausing
      clearInterval(timerRef.current);
      timerRef.current = null;
      setPhase(prev => prev as PomodoroPhase); // trigger re-render
    } else {
      // Resuming
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("idle");
    setRemaining(settings.focusMinutes * 60);
    setTotal(settings.focusMinutes * 60);
    setCompletedFocus(0);
  };

  const isRunning = timerRef.current !== null;
  const isPaused = phase !== "idle" && !isRunning;
  const progress = phase === "idle" ? 0 : ((total - remaining) / total) * 100;

  const phaseLabel: Record<PomodoroPhase, string> = {
    idle: "准备专注",
    focus: "专注中",
    break: "休息中",
    longBreak: "长休息",
  };

  const phaseColor: Record<PomodoroPhase, string> = {
    idle: "var(--accent)",
    focus: "var(--accent)",
    break: "var(--status-success)",
    longBreak: "var(--status-success)",
  };

  // SVG circle params
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const updateSettings = (key: keyof PomodoroSettings, value: number) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    if (phase === "idle") {
      setRemaining(next.focusMinutes * 60);
      setTotal(next.focusMinutes * 60);
    }
  };

  return (
    <div className="pb-24 md:pb-0 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 py-4">
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
        >
          番茄钟
        </h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {phase === "idle" ? "25 分钟专注 + 5 分钟休息" : phaseLabel[phase]}
        </p>
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-6 animate-fade-up">
        <div className="relative">
          <svg width="260" height="260" viewBox="0 0 260 260">
            {/* Background circle */}
            <circle
              cx="130" cy="130" r={radius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="130" cy="130" r={radius}
              fill="none"
              stroke={phaseColor[phase]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 130 130)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[42px] font-bold tabular-nums"
              style={{ color: phaseColor[phase], fontFamily: "'Noto Serif SC', Georgia, serif" }}
            >
              {formatTime(remaining)}
            </span>
            <span className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              {phaseLabel[phase]}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={reset}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
          style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          title="重置"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={togglePause}
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: phaseColor[phase], color: "#fff" }}
        >
          {phase === "idle" ? (
            <Play className="w-6 h-6 ml-0.5" />
          ) : isRunning ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
          style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          title="设置"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Session indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: i < completedFocus % settings.longBreakInterval
                ? "var(--accent)"
                : i === completedFocus % settings.longBreakInterval && phase === "focus"
                  ? "var(--accent-soft)"
                  : "var(--border-subtle)",
            }}
          />
        ))}
        <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>
          第 {completedFocus + 1} 轮
        </span>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="rounded-2xl p-4 mb-6 animate-fade-up"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}
        >
          <h3 className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            时间设置
          </h3>
          <div className="space-y-3">
            <SettingRow
              label="专注"
              icon={<Brain className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />}
              value={settings.focusMinutes}
              onChange={v => updateSettings("focusMinutes", v)}
              min={1} max={60}
            />
            <SettingRow
              label="短休息"
              icon={<Coffee className="w-3.5 h-3.5" style={{ color: "var(--status-success)" }} />}
              value={settings.breakMinutes}
              onChange={v => updateSettings("breakMinutes", v)}
              min={1} max={30}
            />
            <SettingRow
              label="长休息"
              icon={<Coffee className="w-3.5 h-3.5" style={{ color: "var(--status-success)" }} />}
              value={settings.longBreakMinutes}
              onChange={v => updateSettings("longBreakMinutes", v)}
              min={5} max={45}
            />
          </div>
        </div>
      )}

      {/* Today's stats */}
      <div
        className="rounded-2xl p-4"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>今日统计</h3>
          {stats.streak > 0 && (
            <span className="sf-chip sf-chip-accent">🔥 连续 {stats.streak} 天</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--accent-softer)" }}>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: "var(--accent)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
            >
              {stats.todaySessions}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>专注次数</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--accent-softer)" }}>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: "var(--accent)", fontFamily: "'Noto Serif SC', Georgia, serif" }}
            >
              {formatMinutes(stats.todayFocus)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>专注时长</div>
          </div>
        </div>
      </div>

      {/* Request notification permission */}
      {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
        <button
          onClick={() => Notification.requestPermission()}
          className="mt-3 w-full py-2.5 rounded-xl text-[11px] transition-colors"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
        >
          🔔 开启通知提醒（番茄钟结束时通知你）
        </button>
      )}
    </div>
  );
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 5))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          −
        </button>
        <span
          className="w-10 text-center text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {value}分
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 5))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}
