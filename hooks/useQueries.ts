"use client";

import { useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGitHubClient } from "./useGitHubClient";
import { getDB } from "@/lib/db";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { GitHubError } from "@/lib/github/errors";
import type { Assignment, AssignmentDraft, AssignmentsFile, RunRecord, RunType } from "@/types";
import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";
import { loadAdjustments } from "@/lib/schedule/adjustments";
import { readData, writeData } from "@/lib/mobile-data";

// ============================================================
// TanStack Query 数据层 v2 — 本地优先架构
//
// 核心原则：
// 1. 所有数据先存本地（local API → timetable JSON 文件）
// 2. GitHub 仅作为手动导入/导出通道，不自动读取
// 3. 用户在 Settings 点击"从 GitHub 导入"才拉取远程数据
// 4. 导入时智能合并，不会丢失本地独有的数据
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

// ═══════════════════════════════════════════════════════════════
// 合并策略 — 导入时智能合并本地和远程数据，不丢失本地独有数据
// ═══════════════════════════════════════════════════════════════

interface MergeResult<T> {
  merged: T[];
  added: number;  // 远程有、本地没有 → 新增
  updated: number; // 两边都有、远程更新 → 覆盖
  kept: number;   // 两边都有、本地更新 → 保留本地
  localOnly: number; // 本地有、远程没有 → 保留
}

/**
 * 合并作业：按 id 去重
 * - 两边都有：保留较新的（有 completedAt 的优先，否则按 createdAt 判断）
 * - 远程独有的：新增
 * - 本地独有的：保留
 */
function mergeAssignments(local: Assignment[], remote: Assignment[]): MergeResult<Assignment> {
  const localMap = new Map(local.map(a => [a.id, a]));
  const remoteMap = new Map(remote.map(a => [a.id, a]));
  const result = new Map<string, Assignment>();

  let added = 0, updated = 0, kept = 0, localOnly = 0;

  // 先放所有本地数据
  for (const [id, item] of localMap) {
    result.set(id, item);
    if (!remoteMap.has(id)) localOnly++;
  }

  // 合并远程数据
  for (const [id, remoteItem] of remoteMap) {
    const localItem = localMap.get(id);
    if (!localItem) {
      // 远程独有 → 新增
      result.set(id, remoteItem);
      added++;
    } else {
      // 两边都有 → 保留较新的
      // 判断规则：已完成的优先；都未完成按 createdAt 判断；一方已完成则完成方优先
      const localIsNewer = isAssignmentNewer(localItem, remoteItem);
      if (localIsNewer) {
        // 保留本地（已在 result 中）
        kept++;
      } else {
        // 远程更新 → 覆盖
        result.set(id, remoteItem);
        updated++;
      }
    }
  }

  return { merged: sortAssignments([...result.values()]), added, updated, kept, localOnly };
}

function isAssignmentNewer(a: Assignment, b: Assignment): boolean {
  // 已完成的优先
  if (a.done && !b.done) return true;
  if (!a.done && b.done) return false;
  // 都完成了，比较完成时间
  if (a.done && b.done) {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return aTime >= bTime;
  }
  // 都未完成，比较创建时间
  return new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime();
}

/**
 * 合并跑步记录：按 date+type 去重
 * - 相同 date+type 只保留一个
 * - 两边都有时保留任意一个（跑步记录不可变，内容相同）
 */
function mergeRunRecords(local: RunRecord[], remote: RunRecord[]): MergeResult<RunRecord> {
  const seen = new Map<string, RunRecord>();
  let added = 0;

  // 先放本地
  for (const r of local) {
    seen.set(`${r.date}|${r.type}`, r);
  }

  // 合并远程
  for (const r of remote) {
    const key = `${r.date}|${r.type}`;
    if (!seen.has(key)) {
      seen.set(key, r);
      added++;
    }
    // 已存在则跳过（内容相同，无需覆盖）
  }

  return {
    merged: [...seen.values()].sort((a, b) => a.date.localeCompare(b.date)),
    added,
    updated: 0,
    kept: local.length - added > 0 ? local.length - added : 0,
    localOnly: Math.max(0, local.length - (seen.size - added)),
  };
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

  const addMutation = useMutation({
    mutationFn: async (draft: AssignmentDraft) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const newAssignment = buildAssignment(draft);
      const updated = sortAssignments([...current, newAssignment]);
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "添加作业");
      try { await getDB().cacheFile("execution", "data/assignments.json", content, ""); } catch {}
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

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<Assignment[]>(queryKeys.assignments) ?? [];
      const updated = current.map((a) =>
        a.id === id ? { ...a, done: false, completedAt: undefined } : a
      );
      const content = JSON.stringify(updated, null, 2);
      await saveLocally("data/assignments.json", content, "撤销完成");
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
      await saveLocally("data/running.json", content, "记录跑步");
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
// GitHub 同步 — 手动触发，智能合并
// ═══════════════════════════════════════════════════════════════

export interface SyncResult {
  imported: string[];     // 成功导入的数据类型
  errors: string[];       // 失败的数据类型 + 原因
  details: Record<string, string>;  // 每种数据的合并详情
}

export interface PushResult {
  pushed: string[];
  errors: string[];
}

/**
 * 从 GitHub 导入数据到本地（智能合并）
 * - 作业：按 id 合并，本地独有的保留，两边都有取较新的
 * - 跑步：按 date+type 去重合并
 * - 课表：远程覆盖本地（课表由脚本生成，远程通常更新）
 */
export function useSyncFromGitHub() {
  const client = useGitHubClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataTypes: string[]): Promise<SyncResult> => {
      if (!client) throw new Error("请先配置 GitHub Token");

      const imported: string[] = [];
      const errors: string[] = [];
      const details: Record<string, string> = {};

      for (const type of dataTypes) {
        try {
          switch (type) {
            case "schedule": {
              // 课表：远程覆盖本地
              const file = await client.getFile("execution", "data/schedule.json");
              await saveLocally("data/schedule.json", file.content, "导入课表");
              try { await getDB().cacheFile("execution", "data/schedule.json", file.content, file.sha); } catch {}
              const remoteData = JSON.parse(file.content);
              const courseCount = remoteData?.courses?.length ?? 0;
              imported.push("schedule");
              details.schedule = `已导入 ${courseCount} 门课程（覆盖本地）`;
              break;
            }
            case "assignments": {
              // 作业：智能合并
              const local = parseLocalAssignments(await tryLocalApi("assignments")) || [];
              const file = await client.getFile("execution", "data/assignments.json");
              const remoteData = JSON.parse(file.content) as AssignmentsFile;
              const remote = remoteData.assignments || [];
              const result = mergeAssignments(local, remote);

              const content = JSON.stringify({ assignments: result.merged }, null, 2);
              await saveLocally("data/assignments.json", content, "合并作业");
              try { await getDB().cacheFile("execution", "data/assignments.json", content, ""); } catch {}

              imported.push("assignments");
              details.assignments = `合并完成：本地 ${local.length} 条 + 远程 ${remote.length} 条 = ${result.merged.length} 条（新增 ${result.added}，更新 ${result.updated}，保留本地 ${result.localOnly}）`;
              break;
            }
            case "running": {
              // 跑步：按 date+type 去重合并
              const local = parseLocalRecords(await tryLocalApi("running")) || [];
              const file = await client.getFile("execution", "data/running.json");
              const remoteData = JSON.parse(file.content);
              const remote = parseLocalRecords(remoteData) || [];
              const result = mergeRunRecords(local, remote);

              const content = JSON.stringify({ records: result.merged }, null, 2);
              await saveLocally("data/running.json", content, "合并跑步");
              try { await getDB().cacheFile("execution", "data/running.json", content, ""); } catch {}

              imported.push("running");
              details.running = `合并完成：本地 ${local.length} 条 + 远程 ${remote.length} 条 = ${result.merged.length} 条（新增 ${result.added}）`;
              break;
            }
            default:
              errors.push(`${type}: 不支持的数据类型`);
          }
        } catch (e) {
          errors.push(`${type}: ${e instanceof Error ? e.message : "获取失败"}`);
        }
      }

      return { imported, errors, details };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.running });
    },
  });
}

/**
 * 将本地数据推送到 GitHub
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
