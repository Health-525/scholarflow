"use client";

import { useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGitHubClient } from "./useGitHubClient";
import { getDB } from "@/lib/db";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import type { GitHubError } from "@/lib/github/errors";
import type { Assignment, AssignmentDraft, AssignmentsFile, RunRecord, RunType } from "@/types";
import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";

// ============================================================
// TanStack Query 数据层
// 替代原有的手动 fetch + useState 模式
// 特性：SWR、请求去重、自动缓存、离线 IndexedDB 兜底
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
// 本地数据 fallback
// ═══════════════════════════════════════════════════════════════

async function tryLocalApi(type: string) {
  try {
    const res = await fetch(`/api/local-data?type=${type}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

// ── Schedule Hook ──────────────────────────────────────────
export function useScheduleQuery() {
  const client = useGitHubClient();

  return useQuery({
    queryKey: queryKeys.schedule,
    queryFn: async () => {
      const local = await tryLocalApi("schedule");
      if (local?.courses) return { schedule: parseSchedule(local), adjustments: [] };
      if (!client) throw new Error("Not authenticated");

      const [scheduleFile, adjustmentsFile] = await Promise.allSettled([
        client.getFile("execution", "data/schedule.json"),
        client.getFile("execution", "data/adjustments.json"),
      ]);

      if (scheduleFile.status !== "fulfilled") {
        throw scheduleFile.reason as GitHubError;
      }

      const schedule = parseSchedule(JSON.parse(scheduleFile.value.content));
      const adjustments: Adjustment[] =
        adjustmentsFile.status === "fulfilled"
          ? (() => {
              const raw = JSON.parse(adjustmentsFile.value.content);
              return Array.isArray(raw) ? raw : raw.adjustments ?? [];
            })()
          : [];

      // 缓存到 IndexedDB
      try {
        const db = getDB();
        await db.cacheFile("execution", "data/schedule.json", scheduleFile.value.content, scheduleFile.value.sha);
        if (adjustmentsFile.status === "fulfilled") {
          await db.cacheFile("execution", "data/adjustments.json", adjustmentsFile.value.content, adjustmentsFile.value.sha);
        }
      } catch {
        // IndexedDB 不可用（如 SSR），忽略
      }

      return { schedule, adjustments };
    },
    enabled: !!client,
    staleTime: 2 * 60 * 1000, // 2分钟 stale
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

// ── Assignments Hook ───────────────────────────────────────
export function useAssignmentsQuery() {
  const client = useGitHubClient();
  const queryClient = useQueryClient();
  const undoBufferRef = useRef<{ assignment: Assignment; expiresAt: number } | null>(null);

  const query = useQuery({
    queryKey: queryKeys.assignments,
    queryFn: async () => {
      const local = await tryLocalApi("assignments");
      if (Array.isArray(local)) return sortAssignments(local);
      if (!client) throw new Error("Not authenticated");
      const file = await client.getFile("execution", "data/assignments.json");
      const data = JSON.parse(file.content) as AssignmentsFile;
      const assignments = sortAssignments(data.assignments || []);

      try {
        await getDB().cacheFile("execution", "data/assignments.json", file.content, file.sha);
      } catch { /* ignore */ }

      return assignments;
    },
    enabled: !!client,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  // Add assignment mutation
  const addMutation = useMutation({
    mutationFn: async (draft: AssignmentDraft) => {
      if (!client) throw new Error("Not authenticated");
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const newAssignment = buildAssignment(draft);
      const updated = sortAssignments([...current, newAssignment]);
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", "data/assignments.json", content, "添加作业");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
    },
  });

  // Mark done mutation
  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) throw new Error("Not authenticated");
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const target = current.find((a) => a.id === id);
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: true, completedAt: new Date().toISOString() } : a
      );
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", "data/assignments.json", content, "完成作业");
      return { updated, id, target };
    },
    onSuccess: ({ updated, target }) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      if (target) {
        undoBufferRef.current = { assignment: target, expiresAt: Date.now() + 10_000 };
      }
    },
  });

  // Undo mutation
  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) throw new Error("Not authenticated");
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: false, completedAt: undefined } : a
      );
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", "data/assignments.json", content, "撤销完成");
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assignments, updated);
      undoBufferRef.current = null;
    },
  });

  // 封装 undo 为无参函数（从 ref 读取 id）
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
  const client = useGitHubClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.running,
    queryFn: async () => {
      const local = await tryLocalApi("running");
      if (local?.records) return local.records as RunRecord[];
      if (!client) throw new Error("Not authenticated");
      const file = await client.getFile("execution", "data/running.json");
      const data = JSON.parse(file.content) as { records: RunRecord[] };

      try {
        await getDB().cacheFile("execution", "data/running.json", file.content, file.sha);
      } catch { /* ignore */ }

      return data.records || [];
    },
    enabled: !!client,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const addMutation = useMutation({
    mutationFn: async (record: { date: string; type: RunType }) => {
      if (!client) throw new Error("Not authenticated");
      const current = queryClient.getQueryData<RunRecord[]>(queryKeys.running) ?? [];
      const newRecord: RunRecord = {
        ...record,
        createdAt: new Date().toISOString(),
      };
      const updated = [...current, newRecord];
      const content = JSON.stringify({ records: updated }, null, 2);
      await client.putFile("execution", "data/running.json", content, "记录跑步");
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
  const client = useGitHubClient();

  return useQuery({
    queryKey: queryKeys.jwcNews,
    queryFn: async () => {
      // 优先：本地API（Electron直读本地文件）
      try {
        const localRes = await fetch("/api/jwc-news");
        if (localRes.ok) {
          const localData = await localRes.json();
          if (Array.isArray(localData) && localData.length > 0) {
            return { items: localData, fetchedAt: localData[0]?.date || "" };
          }
        }
      } catch { /* fall through to GitHub */ }

      // 备用：GitHub API
      if (!client) throw new Error("Not authenticated");
      const file = await client.getFile("execution", "_out/jwc_news.json");
      const data = JSON.parse(file.content);
      return {
        items: Array.isArray(data) ? data : (data.items || []),
        fetchedAt: data[0]?.date || new Date().toISOString(),
      };
    },
    enabled: true, // 总是启用，本地API不需要token
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
