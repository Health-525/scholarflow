"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";
import { readData, writeData } from "@/lib/mobile-data";
import {
  addAdjustment,
  clearLegacyAdjustments,
  migrateLegacyAdjustments,
  normalizeAdjustments,
  removeAdjustment,
  type Adjustment,
  type AdjustmentDraft,
} from "@/lib/schedule/adjustments";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import { useAuthStore } from "@/store/auth";
import type { Assignment, AssignmentDraft } from "@/types";

// ============================================================
// TanStack Query 数据层 v3 — SQLite 本地优先架构
//
// 核心原则：
// 1. 所有数据存 SQLite（通过 /api/local-data / /api/local-save）
// 2. 数据抓取通过 /api/fetch/* 调用学校适配器
// 3. 不再依赖 GitHub API
// ============================================================

// ── Query Key 工厂 ──────────────────────────────────────────
// 把 schoolId + userId 放进 queryKey，账号切换时 React Query 会自动重新请求，避免缓存串号。
export const queryKeys = {
  schedule: (schoolId?: string | null, userId?: string | null) => ["schedule", schoolId ?? "active", userId ?? "active"] as const,
  scheduleAdjustments: (schoolId?: string | null, userId?: string | null) => ["schedule-adjustments", schoolId ?? "active", userId ?? "active"] as const,
  assignments: (schoolId?: string | null, userId?: string | null) => ["assignments", schoolId ?? "active", userId ?? "active"] as const,
  jwcNews: ["jwcNews"] as const,
  exams: (schoolId?: string | null, userId?: string | null) => ["exams", schoolId ?? "active", userId ?? "active"] as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// 本地数据读写
// ═══════════════════════════════════════════════════════════════

async function saveLocally(file: string, content: string, action = "更新") {
  await writeData(file, content, action);
}

async function tryLocalApi(type: string) {
  return await readData(type);
}

/** 将老格式字段映射到新格式：course→subject, submittedAt→completedAt */
function normalizeAssignment(a: Record<string, unknown>): Assignment {
  return {
    id: (a.id as string) || crypto.randomUUID(),
    subject: (a.subject as string) || (a.course as string) || "",
    title: (a.title as string) || "",
    deadline: (a.deadline as string) || new Date().toISOString(),
    note: (a.note as string) || undefined,
    done: !!a.done,
    createdAt: (a.createdAt as string) || new Date().toISOString(),
    completedAt: (a.completedAt as string) || (a.submittedAt as string) || undefined,
  };
}

/** 解析本地作业数据，兼容 [...] 和 { assignments: [...] } 两种格式，自动映射老字段 */
function parseLocalAssignments(local: unknown): Assignment[] | null {
  let raw: unknown[] | null = null;
  if (Array.isArray(local)) raw = local as unknown[];
  else if (local && typeof local === "object" && Array.isArray((local as Record<string, unknown>).assignments))
    raw = (local as { assignments: unknown[] }).assignments;
  if (!raw) return null;
  return raw.map(a => normalizeAssignment(a as Record<string, unknown>));
}

// ── Schedule Hook ──────────────────────────────────────────
export function useScheduleQuery(initialData?: { schedule: RawScheduleData | null; adjustments: Adjustment[] }) {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.schedule(schoolId, userId),
    queryFn: async () => {
      const local = await tryLocalApi("schedule") as Record<string, unknown> | null;
      if (local?.courses) {
        const schedule = parseSchedule(local);
        const adjustmentsRaw = await tryLocalApi("adjustments");
        let adjustments = normalizeAdjustments(adjustmentsRaw);

        // 若 SQLite 为空，尝试迁移旧版 localStorage 数据（单次，写回后清空旧 key）
        if (adjustments.length === 0) {
          const legacy = migrateLegacyAdjustments(schoolId, userId);
          if (legacy.length > 0) {
            adjustments = normalizeAdjustments(legacy);
            if (adjustments.length > 0) {
              await saveLocally(
                "data/adjustments.json",
                JSON.stringify(adjustments, null, 2),
                "迁移旧版调课记录"
              );
              clearLegacyAdjustments(schoolId, userId);
            }
          }
        }

        return { schedule, adjustments };
      }
      return { schedule: null, adjustments: [] };
    },
    enabled: hasHydrated && initialData === undefined,
    initialData,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ── Schedule Adjustments Hook ──────────────────────────────
// 调课记录的单一数据源是 useScheduleQuery；本 Hook 只提供增删操作，避免两个 query 缓存不一致。
export function useScheduleAdjustments(schedule: RawScheduleData | null) {
  const queryClient = useQueryClient();
  const { data: scheduleData, refetch } = useScheduleQuery();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);
  const scheduleKey = queryKeys.schedule(schoolId, userId);

  const adjustments = scheduleData?.adjustments ?? [];

  type ScheduleCache = { schedule: RawScheduleData | null; adjustments: Adjustment[] } | undefined;

  const getCachedAdjustments = (): Adjustment[] => {
    const cached = queryClient.getQueryData<ScheduleCache>(scheduleKey);
    return cached?.adjustments ?? [];
  };

  const setCacheAdjustments = (next: Adjustment[]) => {
    queryClient.setQueryData(scheduleKey, (old: ScheduleCache) =>
      old ? { ...old, adjustments: next } : undefined
    );
  };

  const persistAdjustments = async (next: Adjustment[]) => {
    await saveLocally(
      "data/adjustments.json",
      JSON.stringify(next, null, 2),
      "更新调课记录"
    );
    return next;
  };

  const addMutation = useMutation({
    mutationFn: async (draft: AdjustmentDraft) => {
      if (!schedule) throw new Error("课表未加载");
      const current = getCachedAdjustments();
      const next = addAdjustment(schedule, current, draft);
      await persistAdjustments(next);
      return next;
    },
    onSuccess: (next) => {
      setCacheAdjustments(next);
      queryClient.invalidateQueries({ queryKey: scheduleKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = getCachedAdjustments();
      const next = removeAdjustment(current, id);
      await persistAdjustments(next);
      return next;
    },
    onSuccess: (next) => {
      setCacheAdjustments(next);
      queryClient.invalidateQueries({ queryKey: scheduleKey });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await persistAdjustments([]);
      return [] as Adjustment[];
    },
    onSuccess: () => {
      setCacheAdjustments([]);
      queryClient.invalidateQueries({ queryKey: scheduleKey });
    },
  });

  return {
    adjustments,
    isLoading: false,
    error: null,
    reload: refetch,
    add: addMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    clear: clearMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isClearing: clearMutation.isPending,
  };
}

// ── Assignments Hook ───────────────────────────────────────
export function useAssignmentsQuery() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const assignmentsKey = queryKeys.assignments(schoolId, userId);

  const query = useQuery({
    queryKey: assignmentsKey,
    queryFn: async () => {
      const local = await tryLocalApi("assignments");
      const localAssignments = parseLocalAssignments(local);
      if (localAssignments && localAssignments.length > 0) return sortAssignments(localAssignments);
      return localAssignments || [];
    },
    enabled: hasHydrated,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  /** 优先读 React Query 缓存；若缓存未加载，回退到本地持久化数据，避免空缓存覆盖。 */
  const getCurrentAssignments = async (): Promise<Assignment[]> => {
    const cached = queryClient.getQueryData<Assignment[]>(assignmentsKey);
    // cached === undefined → 缓存未初始化，回退到磁盘
    // cached === null     → 非标准但防御性处理，同样回退到磁盘
    // cached === []       → 有效空数组（作业确实为空），直接返回，不调用磁盘
    // cached 为非空数组   → 直接返回缓存
    if (cached !== undefined && cached !== null) return cached;
    const local = await tryLocalApi("assignments");
    return parseLocalAssignments(local) ?? [];
  };

  const addMutation = useMutation({
    mutationFn: async (draft: AssignmentDraft) => {
      const current = await getCurrentAssignments();
      const newAssignment = buildAssignment(draft);
      const updated = sortAssignments([...current, newAssignment]);
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "添加作业");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(assignmentsKey, updated);
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = await getCurrentAssignments();
      const target = current.find((a) => a.id === id);
      if (!target) return { updated: current };
      const wasDone = target.done;
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: !wasDone, completedAt: wasDone ? undefined : new Date().toISOString() } : a
      );
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, wasDone ? "撤销完成" : "完成作业");
      return { updated };
    },
    onSuccess: ({ updated }) => {
      queryClient.setQueryData(assignmentsKey, updated);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: AssignmentDraft }) => {
      const current = await getCurrentAssignments();
      const updated = current.map((a) =>
        a.id === id
          ? {
              ...a,
              subject: draft.subject,
              title: draft.title,
              deadline: draft.deadline,
              note: draft.note,
            }
          : a
      );
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "更新作业");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(assignmentsKey, updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = await getCurrentAssignments();
      const updated = current.filter((a) => a.id !== id);
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "删除作业");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(assignmentsKey, updated);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: Assignment[]) => {
      const updated = sortAssignments(next);
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "调整顺序");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(assignmentsKey, updated);
    },
  });

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    reload: () => query.refetch(),
    add: addMutation.mutateAsync,
    markDone: markDoneMutation.mutateAsync,
    reorder: reorderMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isMarking: markDoneMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}

// ── JwcNews Hook ───────────────────────────────────────────
export function useJwcNewsQuery() {
  return useQuery({
    queryKey: queryKeys.jwcNews,
    queryFn: async () => {
      try {
        const localRes = await fetch("/api/local-data?type=jwc-news");
        if (localRes.ok) {
          const localData = await localRes.json();
          if (Array.isArray(localData) && localData.length > 0) {
            return { items: localData, fetchedAt: localData[0]?.date || "" };
          }
        }
      } catch {}
      return { items: [], fetchedAt: "" };
    },
    enabled: true,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

// ── Data Refresh Hook ──────────────────────────────────────
/**
 * 从学校系统重新抓取所有数据
 * 替代原来的 useSyncFromGitHub
 */
export function useRefreshData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, cookie, username }: { schoolId: string; cookie: string; username: string }) => {
      const res = await fetch("/api/fetch/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, cookie, username }),
      });
      const data = await res.json().catch(() => ({}));
      // 规整为调用方统一消费的结构:
      // /api/fetch/all 成功返回 { ok:true, results:{schedule,exams,grades,jwcNews} },
      // 失败返回 { ok:false, needsManualLogin?, error }。
      const fetched = data?.results
        ? Object.entries(data.results)
            .filter(([, v]) => typeof v === "string" && !String(v).startsWith("失败"))
            .map(([, v]) => String(v))
        : [];
      return {
        success: res.ok && data?.ok === true,
        fetched,
        needsManualLogin: data?.needsManualLogin === true,
        error: data?.error as string | undefined,
        results: data?.results,
      };
    },
    onSuccess: () => {
      // 用前缀匹配，使所有账号的 schedule/assignments/exams 缓存都失效
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jwcNews });
    },
  });
}
