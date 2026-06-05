"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────
type TimerMode = "focus" | "shortBreak" | "longBreak";
type TimerStatus = "idle" | "running" | "paused";

interface TimerConfig {
  focus: number; // 分钟
  shortBreak: number;
  longBreak: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_CONFIG: TimerConfig = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息",
};

// ── Component ──────────────────────────────────────────────
export function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_CONFIG.focus * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalTime = DEFAULT_CONFIG[mode] * 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  // 重置当前模式计时器
  const resetTimer = useCallback((newMode: TimerMode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(newMode);
    setTimeLeft(DEFAULT_CONFIG[newMode] * 60);
    setStatus("idle");
  }, []);

  // 计时逻辑
  useEffect(() => {
    if (status !== "running") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 时间到
          clearInterval(intervalRef.current!);
          setStatus("idle");

          // 浏览器通知
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(
              mode === "focus" ? "🍅 专注时间结束！" : "☕ 休息时间结束！",
              {
                body: mode === "focus" ? "该休息一下了" : "准备好下一轮专注了吗？",
                icon: "/icons/logo.png",
              }
            );
          }

          if (mode === "focus") {
            const newCount = completedSessions + 1;
            setCompletedSessions(newCount);
            // 自动切换到休息模式
            const nextMode: TimerMode =
              newCount % DEFAULT_CONFIG.sessionsBeforeLongBreak === 0
                ? "longBreak"
                : "shortBreak";
            setMode(nextMode);
            return DEFAULT_CONFIG[nextMode] * 60;
          } else {
            // 休息结束，回到专注
            setMode("focus");
            return DEFAULT_CONFIG.focus * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, mode, completedSessions]);

  // 格式化时间
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function toggleTimer() {
    if (status === "running") {
      setStatus("paused");
    } else {
      setStatus("running");
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-6 right-20 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{
          backgroundColor: status === "running" ? "#c0392b" : "#2d7a4f",
          color: "#fff",
        }}
        aria-label="Pomodoro计时器"
      >
        <span className="text-base">🍅</span>
      </button>

      {/* Timer panel */}
      {isOpen && (
        <div
          className="fixed bottom-56 md:bottom-20 right-4 z-50 w-[300px] rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Header + Mode selector */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex gap-1 mb-3">
              {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { if (status === "idle") resetTimer(m); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: mode === m ? "var(--accent)" : "var(--surface)",
                    color: mode === m ? "#fff" : "var(--text-secondary)",
                    opacity: status !== "idle" && mode !== m ? 0.5 : 1,
                    cursor: status === "idle" ? "pointer" : "default",
                  }}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Timer display */}
          <div className="px-4 pb-4">
            <div className="text-center mb-3">
              <span
                className="text-4xl font-bold tabular-nums tracking-wider"
                style={{
                  color: mode === "focus"
                    ? status === "running" ? "#c0392b" : "var(--text-primary)"
                    : "var(--accent)",
                  fontFamily: "'Noto Serif SC', Georgia, serif",
                }}
              >
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="h-1.5 rounded-full mb-3 transition-all duration-300"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  backgroundColor: mode === "focus" ? "var(--accent)" : "#27ae60",
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={toggleTimer}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity"
                style={{
                  backgroundColor: status === "running" ? "#c0392b" : "var(--accent)",
                  color: "#fff",
                }}
              >
                {status === "running" ? "⏸ 暂停" : status === "paused" ? "▶ 继续" : "▶ 开始"}
              </button>
              {status !== "idle" && (
                <button
                  onClick={() => resetTimer(mode)}
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  ↺
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            className="px-4 py-2 flex items-center justify-between text-[11px]"
            style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
          >
            <span>已完成 {completedSessions} 个番茄</span>
            <span>🍅 × {completedSessions}</span>
          </div>
        </div>
      )}
    </>
  );
}
