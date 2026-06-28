"use client";

import { Target, Plus, Check, Trash2, Flame } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useGoalSaver } from "@/hooks/useGoalSaver";
import { loadGoals } from "@/lib/goals-api";
import type { DailyGoal, HistoryRecord } from "@/lib/goals-api";
import { useAuthStore } from "@/store/auth";

// ── ProgressRing ─────────────────────────────────────────────

function ProgressRing({
  percent,
  size = 80,
  stroke = 8,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-primary transition-all duration-700"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
        <span className="text-xl font-black tabular-nums">{percent}%</span>
      </div>
    </div>
  );
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
  const pendingDeleteRef = useRef<{ goal: DailyGoal; index: number } | null>(
    null
  );

  const enqueueSave = useGoalSaver(schoolId, userId);

  // ── 初始化 ───────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { state, history: hist } = await loadGoals(schoolId, userId);
        if (cancelled) return;

        const today = new Date().toDateString();
        let nextGoals = state.goals ?? [];
        let nextStreak = state.streak ?? 0;
        let nextHistory = hist ?? [];

        if (state.date && state.date !== today) {
          if (nextGoals.length > 0) {
            const completed = nextGoals.filter((g) => g.done).length;
            const record: HistoryRecord = {
              date: state.date,
              completed,
              total: nextGoals.length,
            };
            nextHistory = [...nextHistory, record].slice(-30);
            nextStreak = nextGoals.every((g) => g.done) ? nextStreak + 1 : 0;
          }
          nextGoals = nextGoals.map((g) => ({ ...g, done: false }));
          await enqueueSave(nextGoals, nextStreak, nextHistory);
        } else if (!state.date) {
          await enqueueSave(nextGoals, nextStreak);
        }

        setGoals(nextGoals);
        setStreak(nextStreak);
        setHistory(nextHistory);
      } catch {
        // 加载失败时保持空状态
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    setLoaded(false);
    init();
    return () => {
      cancelled = true;
    };
  }, [schoolId, userId, enqueueSave]);

  // ── CRUD ─────────────────────────────────────────────────

  const add = useCallback(() => {
    if (!newGoal.trim()) return;
    const g: DailyGoal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: newGoal.trim(),
      done: false,
    };
    setGoals((prev) => {
      const next = [...prev, g];
      enqueueSave(next, streak);
      return next;
    });
    setNewGoal("");
  }, [newGoal, streak, enqueueSave]);

  const toggle = useCallback(
    (id: string) => {
      setGoals((prev) => {
        const next = prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
        enqueueSave(next, streak);
        return next;
      });
    },
    [streak, enqueueSave]
  );

  const del = useCallback(
    (id: string) => {
      setGoals((prev) => {
        const index = prev.findIndex((g) => g.id === id);
        const goal = prev[index];
        if (!goal) return prev;
        const next = prev.filter((g) => g.id !== id);
        enqueueSave(next, streak);

        pendingDeleteRef.current = { goal, index };

        toast.success(`已删除「${goal.text}」`, {
          duration: 5000,
          action: {
            label: "撤销",
            onClick: () => {
              const pending = pendingDeleteRef.current;
              if (!pending || pending.goal.id !== goal.id) return;
              pendingDeleteRef.current = null;
              setGoals((prevGoals) => {
                const restored = [...prevGoals];
                restored.splice(pending.index, 0, pending.goal);
                enqueueSave(restored, streak);
                return restored;
              });
            },
          },
        });

        return next;
      });
    },
    [streak, enqueueSave]
  );

  // ── 派生状态 ─────────────────────────────────────────────

  const done = goals.filter((g) => g.done).length;
  const pct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0;
  const allDone = goals.length > 0 && done === goals.length;

  const week = useMemo(() => {
    const days: {
      label: string;
      date: Date;
      full: boolean;
      hasData: boolean;
    }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toDateString();
      const record = history.find((h) => h.date === key);
      days.push({
        label: d.toLocaleDateString("zh-CN", { weekday: "narrow" }),
        date: d,
        full: record
          ? record.completed === record.total && record.total > 0
          : false,
        hasData: !!record,
      });
    }
    return days;
  }, [history]);

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-primary/10 shadow-sm">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">
            每日目标
          </h1>
          <p className="text-xs text-muted-foreground">小步前进，积少成多</p>
        </div>
      </div>

      {/* 近 7 天 */}
      <Card className="mb-4 hover:shadow-sm hover:translate-y-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">近 7 天</CardTitle>
            <Badge variant="secondary">连续 {streak} 天</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {week.map((d, i) => {
              const isToday = i === 6;
              return (
                <div key={i} className="text-center">
                  <div
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      isToday
                        ? "ring-[3px] ring-[#3370FF] ring-offset-2 ring-offset-background bg-[#F0F5FF] text-[#3370FF]"
                        : d.full
                          ? "bg-green-500 text-primary-foreground shadow-sm"
                          : d.hasData
                            ? "bg-[#E5E6EB] text-muted-foreground"
                            : "bg-[#E5E6EB] text-muted-foreground/50"
                    }`}
                  >
                    {d.full ? <Check size={16} /> : d.date.getDate()}
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="flex items-center gap-5 py-5">
            <ProgressRing percent={loaded ? pct : 0} />
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-0.5">
                今日进度
              </div>
              <div className="text-3xl font-black tabular-nums text-foreground">
                {done}/{goals.length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {goals.length === 0 ? (
                  "先添加目标"
                ) : allDone ? (
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full px-2 py-0.5 text-[11px] font-medium">
                    全部完成
                  </span>
                ) : (
                  <span className="bg-[#F0F5FF] text-[#3370FF] rounded-full px-2 py-0.5 text-[11px] font-medium">
                    继续加油
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm hover:translate-y-0">
          <CardContent className="flex items-center gap-5 py-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
              <Flame className={`w-8 h-8 ${streak > 0 ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-0.5">
                连续天数
              </div>
              <div className="text-3xl font-black tabular-nums text-foreground">
                {loaded ? streak : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {streak > 0 ? "保持连胜" : "从全部完成开始"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 全部完成庆祝 */}
      {allDone && (
        <Card className="mb-5 border-2 border-green-400/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5 dark:from-green-500/15 dark:to-emerald-500/10 animate-fade-up shadow-lg shadow-green-500/5">
          <CardContent className="py-5 text-center">
            <div className="mb-2">
              <span className="text-4xl animate-breathe">🎉</span>
            </div>
            <div className="text-base font-semibold text-green-600 dark:text-green-400">
              今日目标全部达成！
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {streak > 0
                ? `连续 ${streak} 天，明天继续`
                : "明天继续设定新目标"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加目标 */}
      <Card className="mb-4 hover:shadow-sm hover:translate-y-0">
        <CardContent className="py-4">
          <label
            htmlFor="new-goal"
            className="block text-xs font-medium text-muted-foreground mb-1.5"
          >
            今天要做什么？
          </label>
          <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-3">
            <Input
              id="new-goal"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="例如：背 20 个单词"
              className="h-11 text-sm focus:border-[#3370FF] focus:ring-1 focus:ring-[#3370FF]/20"
            />
            <Button
              onClick={add}
              disabled={!newGoal.trim()}
              className="h-11 w-12 shrink-0 p-0 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 目标列表 */}
      <div className="mb-6">
        {!loaded ? (
          <Card className="p-4 hover:shadow-sm hover:translate-y-0">
            <ListSkeleton count={4} />
          </Card>
        ) : goals.length > 0 ? (
          <Card className="hover:shadow-sm hover:translate-y-0">
            <CardContent className="space-y-1 py-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  role="listitem"
                  aria-label={`目标：${g.text}`}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${
                    g.done
                      ? "bg-green-500/5 dark:bg-green-500/10"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={g.done}
                    aria-label={g.done ? "标记为未完成" : "标记为完成"}
                    onClick={() => toggle(g.id)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
                      g.done
                        ? "bg-green-600 dark:bg-green-500 border-2 border-green-600 dark:border-green-500 scale-100"
                        : "border-2 border-border hover:border-[#3370FF]/50 hover:bg-[#F0F5FF]/50"
                    }`}
                  >
                    {g.done && (
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    aria-label={`${g.done ? "标记为未完成" : "标记为完成"}：${g.text}`}
                    className={`flex-1 text-left text-sm transition-all ${
                      g.done
                        ? "line-through text-muted-foreground"
                        : "text-foreground font-medium"
                    }`}
                  >
                    {g.text}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => del(g.id)}
                    aria-label={`删除目标：${g.text}`}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="py-14 hover:shadow-sm hover:translate-y-0">
            <CardContent className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10 animate-breathe">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5 text-foreground">
                设定今日目标
              </h3>
              <p className="text-xs leading-relaxed max-w-xs mx-auto text-muted-foreground/60">
                每天 3 个小目标就够了。完成所有目标即可解锁连续天数。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
