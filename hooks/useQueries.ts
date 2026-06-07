"use client";

import { useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGitHubClient } from "./useGitHubClient";
import { getDB } from "@/lib/db";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import type { GitHubError } from "@/lib/github/errors";
import type { Assignment, AssignmentDraft, AssignmentsFile, RunRecord, RunType } from "@/types";
import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";

// ============================================================
// TanStack Query 数据层 v2 — 本地优先架构
//
// 核心原则：
// 1. 所有数据先存本地（local API → timetable JSON 文件）
// 2. GitHub 仅作为手动导入/导出通道，不自动读取
// 3. 用户在 Settings 点击"从 GitHub 导入"才拉取远程数据
// 4. 用户在 Settings 点击"同步到 GitHub"才推送到远程
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
} as const;

// ═══════════════════════════════════════════════════════════════
// 本地数据读写
// ═══════════════════════════════════════════════════════════════

async function saveLocally(file: string, content: string) {
  await fetch("/api/local-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file, content }),
  });
}

async function tryLocalApi(type: string) {
  try {
    const res = await fetch(`/api/local-data?type=${type}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

/** 解析本地作业数据，兼容 [...] 和 { assignments: [...] } 两种格式 */
function parseLocalAssignments(local: unknown): Assignment[] | null {
  if (Array.isArray(local)) return local as Assignment[];
  if (local && typeof local === "object" && Array.isArray((local as Record<string, unknown>).assignments))
    return (local as { assignments: Assignment[] }).assignments;
  return null;
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
      const local = await tryLocalApi("schedule");
      if (local?.courses) return { schedule: parseSchedule(local), adjustments: [] };
      return { schedule: { courses: [], periods: [] }, adjustments: [] };
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
  const undoBufferRef = useRef<{ assignment: Assignment; expiresAt: number } | null>(null);

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

  // Add assignment
  const addMutation = useMutation({
    mutationFn: async (draft: AssignmentDraft) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const newAssignment = buildAssignment(draft);
      const updated = sortAssignments([...current, newAssignment]);
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await saveLocally("data/assignments.json", content);
      try { await getDB().cacheFile("execution", "data/assignments.json", content, ""); } catch {}
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
    },
  });

  // Mark done
  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const target = current.find((a) => a.id === id);
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: true, completedAt: new Date().toISOString() } : a
      );
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await saveLocally("data/assignments.json", content);
      try { await getDB().cacheFile("execution", "data/assignments.json", content, ""); } catch {}
      return { updated, id, target };
    },
    onSuccess: ({ updated, target }) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      if (target) {
        undoBufferRef.current = { assignment: target, expiresAt: Date.now() + 10_000 };
      }
    },
  });

  // Undo
  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: false, completedAt: undefined } : a
      );
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await saveLocally("data/assignments.json", content);
      try { await getDB().cacheFile("execution", "data/assignments.json", content, ""); } catch {}
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      undoBufferRef.current = null;
    },
  });

  const undo = useCallback(async () => {
    const buf = undoBufferRef.current;
    if (!buf || Date.now() > buf.expiresAt) {
      undoBufferRef.current = null;
      return;
    }
    await undoMutation.mutateAsync(buf.assignment.id);
  }, [undoMutation.mutateAsync]);

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as GitHubError | null,
    reload: () => query.refetch(),
    add: addMutation.mutateAsync,
    markDone: markDoneMutation.mutateAsync,
    undo,
    undoBuffer: undoBufferRef.current,
    isAdding: addMutation.isPending,
    isMarking: markDoneMutation.isPending,
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
      await saveLocally("data/running.json", content);
      try { await getDB().cacheFile("execution", "data/running.json", content, ""); } catch {}
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.running, updated);
    },
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as GitHubError | null,
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
        const localRes = await fetch("/api/jwc-news");
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

// ═══════════════════════════════════════════════════════════════
// GitHub 同步 — 手动触发
// ═══════════════════════════════════════════════════════════════

export interface SyncResult {
  imported: string[];   // 成功导入的数据类型
  errors: string[];     // 失败的数据类型 + 原因
}

export interface PushResult {
  pushed: string[];
  errors: string[];
}

/**
 * 从 GitHub 导入数据到本地
 * 用户手动触发，拉取 GitHub 仓库数据并覆盖本地文件
 */
export function useSyncFromGitHub() {
  const client = useGitHubClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataTypes: string[]): Promise<SyncResult> => {
      if (!client) throw new Error("请先配置 GitHub Token");

      const imported: string[] = [];
      const errors: string[] = [];

      for (const type of dataTypes) {
        try {
          switch (type) {
            case "schedule": {
              const file = await client.getFile("execution", "data/schedule.json");
              await saveLocally("data/schedule.json", file.content);
              try { await getDB().cacheFile("execution", "data/schedule.json", file.content, file.sha); } catch {}
              imported.push("schedule");
              break;
            }
            case "assignments": {
              const file = await client.getFile("execution", "data/assignments.json");
              await saveLocally("data/assignments.json", file.content);
              try { await getDB().cacheFile("execution", "data/assignments.json", file.content, file.sha); } catch {}
              imported.push("assignments");
              break;
            }
            case "running": {
              const file = await client.getFile("execution", "data/running.json");
              await saveLocally("data/running.json", file.content);
              try { await getDB().cacheFile("execution", "data/running.json", file.content, file.sha); } catch {}
              imported.push("running");
              break;
            }
            default:
              errors.push(`${type}: 不支持的数据类型`);
          }
        } catch (e) {
          errors.push(`${type}: ${e instanceof Error ? e.message : "获取失败"}`);
        }
      }

      return { imported, errors };
    },
    onSuccess: () => {
      // 刷新所有 query 以反映新导入的数据
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.running });
    },
  });
}

/**
 * 将本地数据推送到 GitHub
 * 用户手动触发，读取本地文件上传到 GitHub 仓库
 */
export function useSyncToGitHub() {
  const client = useGitHubClient();

  return useMutation({
    mutationFn: async (dataTypes: string[]): Promise<PushResult> => {
      if (!client) throw new Error("请先配置 GitHub Token");

      const pushed: string[] = [];
      const errors: string[] = [];

      for (const type of dataTypes) {
        try {
          const apiType = type === "schedule" ? "schedule"
            : type === "assignments" ? "assignments"
            : type === "running" ? "running"
            : null;

          if (!apiType) { errors.push(`${type}: 不支持的数据类型`); continue; }

          const local = await tryLocalApi(apiType);
          if (!local) { errors.push(`${type}: 本地无数据`); continue; }

          const content = JSON.stringify(
            type === "schedule" ? local
            : type === "assignments" ? { assignments: parseLocalAssignments(local) || [] }
            : { records: parseLocalRecords(local) || [] },
            null, 2
          );

          await client.putFile("execution", `data/${type}.json`, content, `同步${type}数据`);
          pushed.push(type);
        } catch (e) {
          errors.push(`${type}: ${e instanceof Error ? e.message : "推送失败"}`);
        }
      }

      return { pushed, errors };
    },
  });
}
