"use client";

import { useState, useEffect, useCallback } from "react";
import { useGitHubClient } from "./useGitHubClient";
import type { DirectoryEntry } from "@/types";
import type { GitHubError } from "@/lib/github/errors";

/**
 * 列举仓库中某个路径下的文件和目录
 */
export function useDirectory(path: string) {
  const client = useGitHubClient();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const all = await client.listDirectory("content", path);
      // 过滤隐藏文件（.开头）和图片/二进制文件
      const filtered = all.filter((e) => {
        if (e.name.startsWith(".")) return false;
        if (e.type === "file") {
          const ext = e.name.split(".").pop()?.toLowerCase() ?? "";
          return ["md", "txt", "js", "ts", "py", "json", "yaml", "yml", "csv"].includes(ext);
        }
        return true; // dirs
      });
      // 目录在前，文件在后，各自按名称排序
      filtered.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name, "zh-CN");
      });
      setEntries(filtered);
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client, path]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 读取单个文件内容
 */
export function useFileContent(path: string) {
  const client = useGitHubClient();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client || !path) return;
    setIsLoading(true);
    setError(null);
    try {
      const file = await client.getFile("content", path);
      setContent(file.content);
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client, path]);

  useEffect(() => {
    load();
  }, [load]);

  return { content, isLoading, error, reload: load };
}
