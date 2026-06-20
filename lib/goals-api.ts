/**
 * 每日目标模块 API 封装
 *
 * 把原来内联在 app/goals/page.tsx 中的 accountParams / apiLoad / apiSave
 * 提取到这里，避免与 app/exams/page.tsx 的重复复制。
 */

import { accountParams } from "@/lib/api/client";

// ── 类型 ─────────────────────────────────────────────────────

export interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

export interface GoalsState {
  goals: DailyGoal[];
  streak: number;
  date: string;
}

export interface HistoryRecord {
  date: string;
  completed: number;
  total: number;
}

// ── API ──────────────────────────────────────────────────────

export async function loadGoals(
  schoolId: string | null,
  userId: string | null
): Promise<{ state: GoalsState; history: HistoryRecord[] }> {
  const res = await fetch(`/api/goals?${accountParams(schoolId, userId)}`);
  if (!res.ok) throw new Error("加载失败");
  return res.json();
}

export async function saveGoals(
  state: GoalsState,
  history: HistoryRecord[] | undefined,
  schoolId: string | null,
  userId: string | null
): Promise<void> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, history, schoolId, userId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`保存失败 (${res.status}): ${text || res.statusText}`);
  }
}
