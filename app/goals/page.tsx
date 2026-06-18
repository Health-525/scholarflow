"use client";

import { Target, Plus, Check, Trash2, Flame, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

import { SortableList } from "@/components/ui/SortableList";
import { semanticColor, semanticBg } from "@/lib/theme-colors";
import { useAuthStore } from "@/store/auth";

// ── 类型 ────────────────────────────────────────────────────

interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

interface GoalsState {
  goals: DailyGoal[];
  streak: number;
  date: string;
}

interface HistoryRecord {
  date: string;
  completed: number;
  total: number;
}

// ── API helpers ──────────────────────────────────────────────

function accountParams(schoolId: string | null, userId: string | null) {
  const p = new URLSearchParams();
  if (schoolId) p.set("schoolId", schoolId);
  if (userId) p.set("userId", userId);
  return p.toString();
}

async function apiLoad(schoolId: string | null, userId: string | null) {
  const res = await fetch(`/api/goals?${accountParams(schoolId, userId)}`);
  if (!res.ok) throw new Error("加载失败");
  return res.json() as Promise<{ state: GoalsState; history: HistoryRecord[] }>;
}

async function apiSaveState(
  state: GoalsState,
  schoolId: string | null,
  userId: string | null
) {
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, schoolId, userId }),
  });
}

async function apiSaveHistory(
  history: HistoryRecord[],
  schoolId: string | null,
  userId: string | null
) {
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, schoolId, userId }),
  });
}

// ── 主组件 ───────────────────────────────────────────────────

export default function DailyGoalsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);

  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loaded, setLoaded] = useState(false);

  // 避免重复 save 的 ref
  const pendingSave = useRef(false);

  // ── 初始化：加载数据，处理跨天逻辑 ──────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { state, history: hist } = await apiLoad(schoolId, userId);
        if (cancelled) return;

        const today = new Date().toDateString();
        let nextGoals = state.goals ?? [];
        let nextStreak = state.streak ?? 0;
        let nextHistory = hist ?? [];

        // 跨天：把昨天数据存入历史，重置勾选
        if (state.date && state.date !== today) {
          if (nextGoals.length > 0) {
            const completed = nextGoals.filter((g) => g.done).length;
            const record: HistoryRecord = {
              date: state.date,
              completed,
              total: nextGoals.length,
            };
            nextHistory = [...nextHistory, record].slice(-30);

            if (nextGoals.every((g) => g.done)) {
              nextStreak = nextStreak + 1;
            } else {
              nextStreak = 0;
            }
          }
          // 重置勾选状态
          nextGoals = nextGoals.map((g) => ({ ...g, done: false }));

          // 持久化新的 history 和 state
          const newState: GoalsState = { goals: nextGoals, streak: nextStreak, date: today };
          await Promise.all([
            apiSaveState(newState, schoolId, userId),
            apiSaveHistory(nextHistory, schoolId, userId),
          ]);
        } else if (!state.date) {
          // 首次使用：写入今天日期
          const newState: GoalsState = { goals: nextGoals, streak: nextStreak, date: today };
          await apiSaveState(newState, schoolId, userId);
        }

        setGoals(nextGoals);
        setStreak(nextStreak);
        setHistory(nextHistory);
      } catch {
        // 加载失败时保持空状态，不阻断页面
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    setLoaded(false);
    init();
    return () => { cancelled = true; };
  }, [schoolId, userId]);

  // ── 写入 helper：更新 state 并持久化 ───────────────────────

  const persistState = useCallback(
    async (nextGoals: DailyGoal[], nextStreak: number) => {
      if (pendingSave.current) return;
      pendingSave.current = true;
      const today = new Date().toDateString();
      await apiSaveState(
        { goals: nextGoals, streak: nextStreak, date: today },
        schoolId,
        userId
      ).finally(() => { pendingSave.current = false; });
    },
    [schoolId, userId]
  );

  // ── 操作 ─────────────────────────────────────────────────

  const add = useCallback(() => {
    if (!newGoal.trim()) return;
    const g: DailyGoal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: newGoal.trim(),
      done: false,
    };
    setGoals((prev) => {
      const next = [...prev, g];
      persistState(next, streak);
      return next;
    });
    setNewGoal("");
  }, [newGoal, streak, persistState]);

  const toggle = useCallback(
    (id: string) => {
      setGoals((prev) => {
        const next = prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
        persistState(next, streak);
        return next;
      });
    },
    [streak, persistState]
  );

  const del = useCallback(
    (id: string) => {
      setGoals((prev) => {
        const next = prev.filter((g) => g.id !== id);
        persistState(next, streak);
        return next;
      });
    },
    [streak, persistState]
  );

  const reorder = useCallback(
    (next: DailyGoal[]) => {
      setGoals(next);
      persistState(next, streak);
    },
    [streak, persistState]
  );

  // ── 衍生数据 ─────────────────────────────────────────────

  const done = goals.filter((g) => g.done).length;
  const pct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0;
  const allDone = goals.length > 0 && done === goals.length;

  const recent7 = history.slice(-7);
  const recent7Completed = recent7.reduce((s, h) => s + h.completed, 0);
  const recent7Total = recent7.reduce((s, h) => s + h.total, 0);
  const recent7Rate = recent7Total > 0 ? Math.round((recent7Completed / recent7Total) * 100) : 0;

  const successColor = semanticColor("success");
  const successBg = semanticBg("success");
  const warningColor = semanticColor("warning");
  const warningBg = semanticBg("warning");

  // ── 渲染 ─────────────────────────────────────────────────

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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground">今日进度</span>
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: allDone ? successColor : "var(--accent)" }}>
            {loaded ? `${pct}%` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">{done}/{goals.length} 完成</div>
          {goals.length > 0 && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-secondary">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: allDone ? successColor : "var(--accent)" }} />
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4 bg-card shadow-sm animate-fade-up stagger-2 border" style={{ borderColor: warningBg }}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5" style={{ color: warningColor }} />
            <span className="text-[10px] font-semibold text-muted-foreground">连续天数</span>
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: warningColor }}>
            {loaded ? streak : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">天全部完成</div>
        </div>

        <div className="rounded-2xl p-4 bg-card shadow-sm animate-fade-up stagger-3 border" style={{ borderColor: successBg }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5" style={{ color: successColor }} />
            <span className="text-[10px] font-semibold text-muted-foreground">7日完成率</span>
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: successColor }}>
            {loaded ? `${recent7Rate}%` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">{recent7Completed}/{recent7Total} 项</div>
        </div>

        <div className="rounded-2xl p-4 bg-card border border-border shadow-sm animate-fade-up stagger-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">成就等级</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {streak >= 7 ? "A" : streak >= 3 ? "B" : streak >= 1 ? "C" : "D"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {streak >= 7 ? "坚持达人" : streak >= 3 ? "稳步前进" : streak >= 1 ? "初露锋芒" : "等待启动"}
          </div>
        </div>
      </div>

      {/* All-done celebration */}
      {allDone && (
        <div className="rounded-2xl p-5 mb-4 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 dark:border-green-500/30 shadow-sm text-center">
          <div className="text-[28px] mb-2">🎉</div>
          <div className="text-[14px] font-semibold text-green-600 dark:text-green-400">今日目标全部完成！</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {streak > 0 ? `连续 ${streak} 天达成，继续保持` : "明天继续设定新目标"}
          </div>
        </div>
      )}

      {/* Add goal */}
      <div className="flex items-center gap-2 mb-4">
        <input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="今天要做什么？"
          className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        <button
          onClick={add}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Goals list */}
      <div className="mb-6">
        {!loaded ? (
          <div className="text-center py-12 text-[13px] text-muted-foreground">加载中…</div>
        ) : goals.length > 0 ? (
          <SortableList
            items={goals}
            onReorder={reorder}
            itemClassName="animate-fade-up"
            renderItem={(g) => (
              <div
                role="listitem"
                aria-label={`目标：${g.text}`}
                className={`w-full text-left flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-sm ${
                  g.done
                    ? "opacity-70 bg-green-500/5 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/40"
                    : "bg-card border border-border hover:border-primary/20"
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={g.done}
                  aria-label={g.done ? "标记为未完成" : "标记为完成"}
                  onClick={() => toggle(g.id)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                    g.done ? "bg-green-600 dark:bg-green-500 border-2 border-green-600 dark:border-green-500" : "border-2 border-border hover:border-primary/30"
                  }`}
                >
                  {g.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-label={`${g.done ? "标记为未完成" : "标记为完成"}：${g.text}`}
                  className={`flex-1 text-left text-[13px] transition-all ${
                    g.done ? "line-through text-muted-foreground" : "text-foreground font-medium"
                  }`}
                >
                  {g.text}
                </button>
                <button
                  type="button"
                  onClick={() => del(g.id)}
                  aria-label={`删除目标：${g.text}`}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            renderDragOverlay={(g) => (
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                g.done ? "opacity-70 bg-green-500/5 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/40" : "bg-card border border-border"
              }`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  g.done ? "bg-green-600 dark:bg-green-500 border-2 border-green-600 dark:border-green-500" : "border-2 border-border"
                }`}>
                  {g.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={`flex-1 text-[13px] ${
                  g.done ? "line-through text-muted-foreground" : "text-foreground font-medium"
                }`}>{g.text}</span>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          />
        ) : (
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

      {/* Recent 7-day history */}
      {loaded && recent7.length > 0 && (
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
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
                    isFull ? "bg-green-500 dark:bg-green-600 text-primary-foreground" : rate > 0 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
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
