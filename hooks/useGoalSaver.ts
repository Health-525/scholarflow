"use client";

import { useRef, useCallback } from "react";

import { saveGoals } from "@/lib/goals-api";
import type { DailyGoal, GoalsState, HistoryRecord } from "@/lib/goals-api";

/**
 * 串行保存队列 hook。
 *
 * 将每次保存追加到 Promise 链尾部，保证并发调用时不会乱序写入。
 * 即使中间某次保存失败，队列也会继续执行后续操作（catch 已静默处理）。
 */
export function useGoalSaver(
  schoolId: string | null,
  userId: string | null
) {
  const queue = useRef(Promise.resolve());

  return useCallback(
    (
      nextGoals: DailyGoal[],
      nextStreak: number,
      nextHistory?: HistoryRecord[]
    ) => {
      const today = new Date().toDateString();
      const state: GoalsState = {
        goals: nextGoals,
        streak: nextStreak,
        date: today,
      };
      queue.current = queue.current
        .catch(() => {})
        .then(() => saveGoals(state, nextHistory, schoolId, userId));
      return queue.current;
    },
    [schoolId, userId]
  );
}
