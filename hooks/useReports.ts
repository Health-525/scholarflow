"use client";

import { useState, useEffect, useCallback } from "react";
import { useGitHubClient } from "./useGitHubClient";
import type { DirectoryEntry } from "@/types";
import type { GitHubError } from "@/lib/github/errors";

interface ReportsState {
  entries: DirectoryEntry[];
  isLoading: boolean;
  error: GitHubError | null;
  reload: () => void;
}

/**
 * 获取日报列表
 */
export function useDailyReports(): ReportsState {
  const client = useGitHubClient();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const all = await client.listDirectory("content", "日报");
      const files = all
        .filter((e) => e.type === "file" && e.name.endsWith(".md"))
        .sort((a, b) => b.name.localeCompare(a.name)); // newest first
      setEntries(files);
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 获取周报列表
 */
export function useWeeklyReports(): ReportsState {
  const client = useGitHubClient();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const all = await client.listDirectory("content", "周报");
      const files = all
        .filter((e) => e.type === "file" && e.name.endsWith(".md"))
        .sort((a, b) => b.name.localeCompare(a.name)); // newest first
      setEntries(files);
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 获取单篇报告内容
 */
export function useReportContent(
  type: "daily" | "weekly",
  slug: string
): { content: string; isLoading: boolean; error: GitHubError | null } {
  const client = useGitHubClient();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  useEffect(() => {
    if (!client || !slug) return;

    const folder = type === "daily" ? "日报" : "周报";
    const path = `${folder}/${slug}.md`;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    client
      .getFile("content", path)
      .then((file) => {
        if (!cancelled) {
          setContent(file.content);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err as GitHubError);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, type, slug]);

  return { content, isLoading, error };
}
