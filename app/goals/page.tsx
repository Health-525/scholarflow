"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Check, Trash2 } from "lucide-react";

interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

const LS_KEY = "sf_daily_goals";
const STREAK_KEY = "sf_goal_streak";
const DATE_KEY = "sf_goal_date";

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

  // Single init effect: load goals, check day change, update streak
  useEffect(() => {
    const stored = loadGoals();
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(DATE_KEY);

    if (lastDate && lastDate !== today) {
      // Day changed: check if yesterday's goals were all done
      if (stored.length > 0 && stored.every(g => g.done)) {
        // Yesterday completed — increment streak
        const newStreak = getStreak() + 1;
        setStreakState(newStreak);
        setStreak(newStreak);
      } else if (stored.length > 0) {
        // Had goals but didn't complete — reset streak
        setStreakState(0);
        setStreak(0);
      }
      // If no goals yesterday, streak stays unchanged

      // Reset done status for the new day
      const reset = stored.map(g => ({ ...g, done: false }));
      setGoals(reset);
      saveGoals(reset);
    } else {
      setGoals(stored);
    }

    localStorage.setItem(DATE_KEY, today);
    setStreakState(getStreak());
  }, []);

  const add = useCallback(() => {
    if (!newGoal.trim()) return;
    const g: DailyGoal = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: newGoal.trim(), done: false };
    setGoals(prev => {
      const u = [...prev, g];
      saveGoals(u);
      return u;
    });
    setNewGoal("");
  }, [newGoal]);

  const toggle = useCallback((id: string) => {
    setGoals(prev => {
      const u = prev.map(g => g.id === id ? { ...g, done: !g.done } : g);
      saveGoals(u);
      return u;
    });
  }, []);

  const del = useCallback((id: string) => {
    setGoals(prev => {
      const u = prev.filter(g => g.id !== id);
      saveGoals(u);
      return u;
    });
  }, []);

  const done = goals.filter(g => g.done).length;
  const pct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0;

  return (
    <div className="pb-24 md:pb-0">
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold text-foreground">每日目标</h1>
        <p className="text-[12px] text-muted-foreground">
          {streak > 0 ? `连续 ${streak} 天全部完成` : "66% 的大学生做计划但放弃，从今天开始改变"}
        </p>
      </div>

      {/* Progress */}
      {goals.length > 0 && (
        <div className="rounded-2xl p-5 mb-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-muted-foreground">今日进度</span>
            <span className={`text-[12px] tabular-nums font-bold ${pct === 100 ? "text-green-600" : "text-primary"}`}>
              {done}/{goals.length}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-600" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-primary">
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
          className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none bg-card border border-border text-foreground placeholder:text-muted-foreground"
        />
        <button onClick={add} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        {goals.map(g => (
          <div
            key={g.id}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer ${g.done ? "opacity-60 bg-green-500/5 border border-green-500/40" : "bg-card border border-border"}`}
            onClick={() => toggle(g.id)}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${g.done ? "bg-green-600 border-2 border-green-600" : "border-2 border-border"}`}>
              {g.done && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`flex-1 text-[13px] ${g.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {g.text}
            </span>
            <button onClick={e => { e.stopPropagation(); del(g.id); }} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-[14px] font-semibold mb-1.5 text-foreground">设定今日目标</h3>
            <p className="text-[12px] leading-relaxed max-w-[260px] mx-auto text-muted-foreground">
              每天3个小目标就够了。完成所有目标解锁连续天数成就。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
