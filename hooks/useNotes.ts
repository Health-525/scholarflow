"use client";

import { useState, useEffect, useCallback } from "react";

import { useAuthStore } from "@/store/auth";

export interface NoteTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: NoteTreeNode[];
}

function getQueryPrefix(): string {
  if (typeof window === "undefined") return "schoolId=default&userId=default";
  const auth = useAuthStore.getState();
  const schoolId = auth.schoolId || "default";
  const userId = auth.userId || "default";
  return `schoolId=${encodeURIComponent(schoolId)}&userId=${encodeURIComponent(userId)}`;
}

/**
 * 读取笔记目录树
 */
export function useNoteTree() {
  const [tree, setTree] = useState<NoteTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/tree?${getQueryPrefix()}`);
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
    load();
  }, [load]);

  return { tree, isLoading, error, reload: load };
}

/**
 * 读取单个文件内容
 */
export function useNoteContent(path: string | null) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!path) {
      setContent("");
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes?${getQueryPrefix()}&path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("加载笔记失败");
      const data = (await res.json()) as { content: string };
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [path]);

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
  const auth = useAuthStore.getState();
  return { schoolId: auth.schoolId || "default", userId: auth.userId || "default" };
}
