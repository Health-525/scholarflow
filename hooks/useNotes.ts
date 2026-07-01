"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { getAuthParams } from "@/lib/api/auth-params";
import { useAuthStore } from "@/store/auth";
import type { NoteTreeNode } from "@/types";

/**
 * 读取笔记目录树。
 * 在 auth hydrate 后（schoolId/userId 从空变为实际值时）自动重新加载，
 * 避免首次渲染拿到 default 命名空间的数据。
 */
export function useNoteTree() {
  const [tree, setTree] = useState<NoteTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 订阅 auth，让 schoolId/userId 变化时触发重载
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/tree?${getAuthParams()}`, { signal });
      if (!res.ok) throw new Error("加载文件树失败");
      const data = (await res.json()) as NoteTreeNode[];
      setTree(data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 只在 schoolId/userId 变化时加载，避免其他 auth 字段变化触发无意义请求
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [schoolId, userId, load]);

  const reload = useCallback(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  return { tree, isLoading, error, reload };
}

/**
 * 读取单个文件内容。
 * 同样在 auth hydrate 后自动重载。
 */
export function useNoteContent(path: string | null) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.userId);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!path) {
      setContent("");
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes?${getAuthParams()}&path=${encodeURIComponent(path)}`, { signal });
      if (!res.ok) throw new Error("加载笔记失败");
      const data = (await res.json()) as { content: string };
      setContent(data.content);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  // getAuthParams() 从 store 读取最新值，不需要把 schoolId/userId 加入依赖数组
  // 改为通过 accountKey effect 在账号变化时手动触发 load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // 账号变化时重新加载
  const prevAccountKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${schoolId || ""}:${userId || ""}`;
    if (prevAccountKeyRef.current !== key) {
      prevAccountKeyRef.current = key;
      const abort = new AbortController();
      load(abort.signal);
      return () => abort.abort();
    }
  }, [schoolId, userId, load]);

  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  const reload = useCallback(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  return { content, isLoading, error, reload, setContent };
}

/**
 * 保存笔记
 */
export async function saveNote(path: string, content: string): Promise<void> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", path, content, ...getAuthBody() }),
  });
  if (!res.ok) throw new Error("保存失败");
}

/**
 * 创建新笔记
 */
export async function createNote(path: string, content = ""): Promise<void> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", path, content, ...getAuthBody() }),
  });
  if (!res.ok) throw new Error("创建失败");
}

/**
 * 重命名笔记（保持原分类不变）
 */
export async function renameNote(path: string, newPath: string): Promise<void> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rename", path, newPath, ...getAuthBody() }),
  });
  if (!res.ok) throw new Error("重命名失败");
}

/**
 * 删除笔记
 */
export async function deleteNote(path: string): Promise<void> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", path, ...getAuthBody() }),
  });
  if (!res.ok) throw new Error("删除失败");
}

function getAuthBody(): { schoolId: string; userId: string } {
  const { schoolId, userId } = useAuthStore.getState();
  return {
    schoolId: schoolId || "",
    userId: userId || "",
  };
}

// ── 搜索 ──

export function useNoteSearch() {
  const [results, setResults] = useState<import("@/types").NoteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/search?${getAuthParams()}&q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("搜索失败");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { results, isSearching, error, search, clear: () => setResults([]) };
}

// ── 标签 ──

export function useNoteTags(path: string | null) {
  const [tags, setTagsState] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<import("@/types").TagInfo[]>([]);

  const loadTags = useCallback(async () => {
    if (!path) { setTagsState([]); return; }
    try {
      const res = await fetch(`/api/notes/tags?${getAuthParams()}&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setTagsState(data.tags || []);
      }
    } catch { /* ignore */ }
  }, [path]);

  const loadAllTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/tags?${getAuthParams()}`);
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch { /* ignore */ }
  }, []);

  const saveTags = useCallback(async (newTags: string[]) => {
    if (!path) return;
    const auth = getAuthBody();
    await fetch("/api/notes/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, tags: newTags, ...auth }),
    });
    setTagsState(newTags);
    loadAllTags();
  }, [path, loadAllTags]);

  useEffect(() => { loadTags(); }, [loadTags]);

  return { tags, allTags, loadAllTags, saveTags };
}

// ── 历史 ──

export function useNoteHistory(path: string | null) {
  const [history, setHistory] = useState<import("@/types").NoteHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/history?${getAuthParams()}&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      } else {
        setError(new Error("加载历史版本失败"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("加载历史版本失败"));
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  const restore = useCallback(async (versionIndex: number) => {
    const auth = getAuthBody();
    const res = await fetch("/api/notes/history/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, versionIndex, ...auth }),
    });
    if (!res.ok) throw new Error("恢复失败");
  }, [path]);

  useEffect(() => { load(); }, [load]);

  return { history, isLoading, error, load, restore };
}

// ── 固定 ──

export async function togglePin(path: string, pinned: boolean): Promise<void> {
  const auth = getAuthBody();
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: pinned ? "pin" : "unpin", path, ...auth }),
  });
  if (!res.ok) throw new Error("操作失败");
}
