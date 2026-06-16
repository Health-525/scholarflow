"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";
import { readData, writeData } from "@/lib/mobile-data";
import { loadAdjustments } from "@/lib/schedule/adjustments";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { Assignment, AssignmentDraft, RunRecord, RunType } from "@/types";

// ============================================================
// TanStack Query 数据层 v3 — SQLite 本地优先架构
//
// 核心原则：
// 1. 所有数据存 SQLite（通过 /api/local-data / /api/local-save）
// 2. 数据抓取通过 /api/fetch/* 调用学校适配器
// 3. 不再依赖 GitHub API
// ============================================================

// ── Query Key 工厂 ──────────────────────────────────────────
export const queryKeys = {
  schedule: ["schedule"] as const,
  assignments: ["assignments"] as const,
  running: ["running"] as const,
  jwcNews: ["jwcNews"] as const,
  dailyReports: ["dailyReports"] as const,
  weeklyReports: ["weeklyReports"] as const,
  notes: ["notes"] as const,
  exams: ["exams"] as const,
  health: ["health"] as const,
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

/** 解析本地跑步数据，兼容 { records: [...] } 和 [...] 格式 */
function parseLocalRecords(local: unknown): RunRecord[] | null {
  if (local && typeof local === "object" && Array.isArray((local as Record<string, unknown>).records))
    return (local as { records: RunRecord[] }).records;
  if (Array.isArray(local)) return local as RunRecord[];
  return null;
}

// ── Schedule Hook ──────────────────────────────────────────
export function useScheduleQuery() {
  return useQuery({
    queryKey: queryKeys.schedule,
    queryFn: async () => {
      const local = await tryLocalApi("schedule") as Record<string, unknown> | null;
      if (local?.courses) {
        const schedule = parseSchedule(local);
        const adjustments = loadAdjustments();
        return { schedule, adjustments };
      }
      return { schedule: null, adjustments: [] };
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ── Assignments Hook ───────────────────────────────────────
export function useAssignmentsQuery() {
  const queryClient = useQueryClient();
  const [undoBuffer, setUndoBuffer] = useState<{ assignment: Assignment; expiresAt: number } | null>(null);

  const query = useQuery({
    queryKey: queryKeys.assignments,
    queryFn: async () => {
      const local = await tryLocalApi("assignments");
      const localAssignments = parseLocalAssignments(local);
      if (localAssignments && localAssignments.length > 0) return sortAssignments(localAssignments);
      return localAssignments || [];
    },
    enabled: true,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: async (draft: AssignmentDraft) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const newAssignment = buildAssignment(draft);
      const updated = sortAssignments([...current, newAssignment]);
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "添加作业");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const target = current.find((a) => a.id === id);
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: true, completedAt: new Date().toISOString() } : a
      );
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "完成作业");
      return { updated, id, target };
    },
    onSuccess: ({ updated, target }) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      if (target) {
        setUndoBuffer({ assignment: target, expiresAt: Date.now() + 10_000 });
      }
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: false, completedAt: undefined } : a
      );
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "撤销完成");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      setUndoBuffer(null);
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
      queryClient.setQueryData(queryKeys.assignments, updated);
    },
  });

  const undo = useCallback(async () => {
    if (!undoBuffer || Date.now() > undoBuffer.expiresAt) {
      setUndoBuffer(null);
      return;
    }
    await undoMutation.mutateAsync(undoBuffer.assignment.id);
  }, [undoBuffer, undoMutation.mutateAsync]);

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    reload: () => query.refetch(),
    add: addMutation.mutateAsync,
    markDone: markDoneMutation.mutateAsync,
    reorder: reorderMutation.mutateAsync,
    undo,
    undoBuffer,
    isAdding: addMutation.isPending,
    isMarking: markDoneMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}

// ── Running Hook ───────────────────────────────────────────
export function useRunningQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.running,
    queryFn: async () => {
      const local = await tryLocalApi("running");
      const localRecords = parseLocalRecords(local);
      if (localRecords && localRecords.length > 0) return localRecords;
      return [];
    },
    enabled: true,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: async (record: { date: string; type: RunType }) => {
      const current = queryClient.getQueryData<RunRecord[]>(queryKeys.running) ?? [];
      const newRecord: RunRecord = { ...record, createdAt: new Date().toISOString() };
      const updated = [...current, newRecord];
      const content = JSON.stringify({ records: updated }, null, 2);
      await saveLocally("data/running.json", content, "记录跑步");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.running, updated);
    },
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    reload: () => query.refetch(),
    addRecord: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
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
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.running });
      queryClient.invalidateQueries({ queryKey: queryKeys.jwcNews });
    },
  });
}
