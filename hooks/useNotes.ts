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
  const prevKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/tree?${getAuthParams()}`);
      if (!res.ok) throw new Error("加载文件树失败");
      const data = (await res.json()) as NoteTreeNode[];
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 只在账号 key 真正变化时重新加载（避免其他 auth 字段变化触发无意义请求）
    const key = `${schoolId || ""}:${userId || ""}`;
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      load();
    }
  }, [schoolId, userId, load]);

  return { tree, isLoading, error, reload: load };
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

  const load = useCallback(async () => {
    if (!path) {
      setContent("");
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes?${getAuthParams()}&path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("加载笔记失败");
      const data = (await res.json()) as { content: string };
      setContent(data.content);
    } catch (err) {
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
      load();
    }
  }, [schoolId, userId, load]);

  useEffect(() => {
    load();
  }, [load]);

  return { content, isLoading, error, reload: load, setContent };
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
