"use client";

import { useState, useEffect } from "react";
import { Target, Plus, Check, X, Trash2 } from "lucide-react";

interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

const LS_KEY = "sf_daily_goals";
const STREAK_KEY = "sf_goal_streak";

function loadGoals(): DailyGoal[] {
  try { const r = localStorage.getItem(LS_KEY); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
}
function saveGoals(goals: DailyGoal[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(goals)); } catch { /* ignore */ }
}
function getStreak(): number {
  try { return parseInt(localStorage.getItem(STREAK_KEY) || "0"); } catch { return 0; }
}
function setStreak(n: number) {
  try { localStorage.setItem(STREAK_KEY, String(n)); } catch { /* ignore */ }
}

export default function DailyGoalsPage() {
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [streak, setStreakState] = useState(0);

  useEffect(() => {
    setGoals(loadGoals());
    setStreakState(getStreak());
  }, []);

  const todayKey = new Date().toDateString();
  useEffect(() => {
    const lastDate = localStorage.getItem("sf_goal_date");
    const today = todayKey;
    if (lastDate !== today) {
      // Check if all goals from yesterday were done
      const prev = loadGoals();
      if (prev.length > 0 && prev.every(g => g.done)) {
        setStreakState(s => { const ns = s + 1; setStreak(ns); return ns; });
      } else if (lastDate) {
        setStreakState(0); setStreak(0);
      }
      // Reset for today
      const reset = prev.map(g => ({ ...g, done: false }));
      setGoals(reset);
      saveGoals(reset);
      localStorage.setItem("sf_goal_date", today);
    } else {
      localStorage.setItem("sf_goal_date", today);
    }
  }, []);

  const add = () => {
    if (!newGoal.trim()) return;
    const g: DailyGoal = { id: Date.now().toString(36), text: newGoal.trim(), done: false };
    const u = [...goals, g];
    setGoals(u); saveGoals(u); setNewGoal("");
  };

  const toggle = (id: string) => {
    const u = goals.map(g => g.id === id ? { ...g, done: !g.done } : g);
    setGoals(u); saveGoals(u);

    // Streak check
    if (u.length > 0 && u.every(g => g.done)) {
      const s = getStreak() + 1;
      setStreakState(s); setStreak(s);
    }
  };

  const del = (id: string) => {
    const u = goals.filter(g => g.id !== id);
    setGoals(u); saveGoals(u);
  };

  const done = goals.filter(g => g.done).length;
  const pct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0;

  return (
    <div className="pb-24 md:pb-0 max-w-lg mx-auto">
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>每日目标</h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {streak > 0 ? `连续 ${streak} 天全部完成` : "66% 的大学生做计划但放弃，从今天开始改变"}
        </p>
      </div>

      {/* Progress */}
      {goals.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>今日进度</span>
            <span className="text-[12px] tabular-nums font-bold" style={{ color: pct === 100 ? "var(--status-success)" : "var(--accent)" }}>
              {done}/{goals.length}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? "var(--status-success)" : "var(--accent)" }} />
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: "var(--accent)" }}>
              <Target className="w-3 h-3" /> 连续 {streak} 天
            </div>
          )}
        </div>
      )}

      {/* Add */}
      <div className="flex items-center gap-2 mb-4">
        <input
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="今天要做什么？"
          className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none"
          style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button onClick={add} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        {goals.map(g => (
          <div
            key={g.id}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer ${g.done ? "opacity-60" : ""}`}
            style={{ border: `1px solid ${g.done ? "var(--status-success)" : "var(--border-subtle)"}`, backgroundColor: g.done ? "rgba(45,122,79,0.05)" : "var(--surface-card)" }}
            onClick={() => toggle(g.id)}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0`}
              style={{
                border: `2px solid ${g.done ? "var(--status-success)" : "var(--border-strong)"}`,
                backgroundColor: g.done ? "var(--status-success)" : "transparent",
              }}
            >
              {g.done && <Check className="w-3 h-3" style={{ color: "#fff" }} />}
            </div>
            <span className={`flex-1 text-[13px] ${g.done ? "line-through" : ""}`} style={{ color: g.done ? "var(--text-tertiary)" : "var(--text-primary)" }}>
              {g.text}
            </span>
            <button onClick={e => { e.stopPropagation(); del(g.id); }} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)" }}>
              <Target className="w-6 h-6" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>设定今日目标</h3>
            <p className="text-[12px] leading-relaxed max-w-[260px] mx-auto" style={{ color: "var(--text-tertiary)" }}>
              每天3个小目标就够了。完成所有目标解锁连续天数成就。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
