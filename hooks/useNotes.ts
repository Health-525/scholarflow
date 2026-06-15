"use client";

import { useState, useEffect, useCallback } from "react";

import type { DirectoryEntry } from "@/types";

/**
 * 列举本地数据中某个路径下的文件和目录
 * 目前返回空列表 — 笔记功能将在后续版本通过本地存储实现
 */
export function useDirectory(path: string) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: implement local notes directory listing
      setEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 读取单个文件内容
 * 目前返回空内容 — 笔记功能将在后续版本通过本地存储实现
 */
export function useFileContent(path: string) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    try {
      // TODO: implement local file content reading
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { content, isLoading, error, reload: load };
}
