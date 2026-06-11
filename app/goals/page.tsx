"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Check, Trash2, Flame, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { semanticColor, semanticBg } from "@/lib/theme-colors";

interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

const LS_KEY = "sf_daily_goals";
const STREAK_KEY = "sf_goal_streak";
const DATE_KEY = "sf_goal_date";
const HISTORY_KEY = "sf_goal_history";

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
function loadHistory(): { date: string; completed: number; total: number }[] {
  try { const r = localStorage.getItem(HISTORY_KEY); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
}
function saveHistory(history: { date: string; completed: number; total: number }[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
}

export default function DailyGoalsPage() {
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [streak, setStreakState] = useState(0);
  const [history, setHistory] = useState<{ date: string; completed: number; total: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const stored = loadGoals();
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(DATE_KEY);
    const hist = loadHistory();

    if (lastDate && lastDate !== today) {
      // Save yesterday's stats to history
      if (stored.length > 0) {
        const completed = stored.filter(g => g.done).length;
        hist.push({ date: lastDate, completed, total: stored.length });
        saveHistory(hist.slice(-30)); // Keep last 30 days
      }

      if (stored.length > 0 && stored.every(g => g.done)) {
        const newStreak = getStreak() + 1;
        setStreakState(newStreak);
        setStreak(newStreak);
      } else if (stored.length > 0) {
        setStreakState(0);
        setStreak(0);
      }

      const reset = stored.map(g => ({ ...g, done: false }));
      setGoals(reset);
      saveGoals(reset);
    } else {
      setGoals(stored);
    }

    localStorage.setItem(DATE_KEY, today);
    setStreakState(getStreak());
    setHistory(hist);
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
  const allDone = goals.length > 0 && done === goals.length;

  // Recent history stats
  const recent7 = history.slice(-7);
  const recent7Completed = recent7.reduce((s, h) => s + h.completed, 0);
  const recent7Total = recent7.reduce((s, h) => s + h.total, 0);
  const recent7Rate = recent7Total > 0 ? Math.round((recent7Completed / recent7Total) * 100) : 0;

  const successColor = semanticColor("success");
  const successBg = semanticBg("success");
  const warningColor = semanticColor("warning");
  const warningBg = semanticBg("warning");

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">每日目标</h1>
          <p className="text-[12px] text-muted-foreground">
            {streak > 0 ? `连续 ${streak} 天全部完成 🔥` : "设定小目标，从今天开始改变"}
          </p>
        </div>
      </div>

      {/* Bento Grid: Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Progress */}
        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground">今日进度</span>
          </div>
          <div className="text-2xl font-bold tabular-nums animate-count" style={{ color: allDone ? successColor : "var(--accent)" }}>
            {pct}%
          </div>
          <div className="text-[10px] text-muted-foreground">{done}/{goals.length} 完成</div>
          {goals.length > 0 && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: allDone ? successColor : "var(--accent)",
                }}
              />
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="rounded-2xl p-4 bg-card shadow-sm animate-fade-up stagger-2" style={{ border: `1px solid ${warningBg}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5" style={{ color: warningColor }} />
            <span className="text-[10px] font-semibold text-muted-foreground">连续天数</span>
          </div>
          <div className="text-2xl font-bold tabular-nums animate-count" style={{ color: warningColor }}>
            {streak}
          </div>
          <div className="text-[10px] text-muted-foreground">天全部完成</div>
        </div>

        {/* 7-day rate */}
        <div className="rounded-2xl p-4 bg-card shadow-sm animate-fade-up stagger-3" style={{ border: `1px solid ${successBg}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5" style={{ color: successColor }} />
            <span className="text-[10px] font-semibold text-muted-foreground">7日完成率</span>
          </div>
          <div className="text-2xl font-bold tabular-nums animate-count" style={{ color: successColor }}>
            {recent7Rate}%
          </div>
          <div className="text-[10px] text-muted-foreground">{recent7Completed}/{recent7Total} 项</div>
        </div>

        {/* Achievement */}
        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">成就等级</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground animate-count">
            {streak >= 7 ? "A" : streak >= 3 ? "B" : streak >= 1 ? "C" : "D"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {streak >= 7 ? "坚持达人" : streak >= 3 ? "稳步前进" : streak >= 1 ? "初露锋芒" : "等待启动"}
          </div>
        </div>
      </div>

      {/* All-done celebration */}
      {allDone && (
        <div className="rounded-2xl p-5 mb-4 bg-green-500/5 border border-green-500/20 shadow-sm animate-fade-up text-center">
          <div className="text-[28px] mb-2">🎉</div>
          <div className="text-[14px] font-semibold text-green-600">今日目标全部完成！</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {streak > 0 ? `连续 ${streak} 天达成，继续保持` : "明天继续设定新目标"}
          </div>
        </div>
      )}

      {/* Add goal */}
      <div className="flex items-center gap-2 mb-4 animate-fade-up stagger-5">
        <input
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="今天要做什么？"
          className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        <button onClick={add} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Goals list */}
      <div className="space-y-2 mb-6">
        {goals.map((g, i) => (
          <div
            key={g.id}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer animate-fade-up hover:shadow-sm ${
              g.done
                ? "opacity-70 bg-green-500/5 border border-green-500/30"
                : "bg-card border border-border hover:border-primary/20"
            }`}
            style={{ animationDelay: `${i * 0.03}s` }}
            onClick={() => toggle(g.id)}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
              g.done ? "bg-green-600 border-2 border-green-600" : "border-2 border-border hover:border-primary/30"
            }`}>
              {g.done && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`flex-1 text-[13px] transition-all ${g.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
              {g.text}
            </span>
            <button onClick={e => { e.stopPropagation(); del(g.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <div className="text-center py-16 animate-fade-up">
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

      {/* Recent 7-day history */}
      {recent7.length > 0 && (
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm animate-fade-up stagger-6">
          <div className="flex items-center gap-2 mb-4">
            <ChevronRight className="w-4 h-4 text-primary" />
            <h2 className="text-[13px] font-semibold text-foreground">近7日记录</h2>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {recent7.map((h, i) => {
              const rate = h.total > 0 ? Math.round((h.completed / h.total) * 100) : 0;
              const isFull = rate === 100;
              const dayLabel = new Date(h.date).toLocaleDateString("zh-CN", { weekday: "short" });
              return (
                <div key={i} className="text-center">
                  <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    isFull ? "bg-green-500 text-white" : rate > 0 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {rate}%
                  </div>
                  <div className="text-[9px] mt-1 text-muted-foreground">{dayLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}