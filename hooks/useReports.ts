"use client";

import { useState, useEffect, useCallback } from "react";

import type { DirectoryEntry } from "@/types";

interface ReportsState {
  entries: DirectoryEntry[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * 获取日报列表 — 从本地 API 读取
 */
export function useDailyReports(): ReportsState {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/local-data?type=dailyReports");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEntries(data);
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 获取周报列表 — 从本地 API 读取
 */
export function useWeeklyReports(): ReportsState {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/local-data?type=weeklyReports");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEntries(data);
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 获取单篇报告内容 — 从本地 API 读取
 */
export function useReportContent(
  type: "daily" | "weekly",
  slug: string
): { content: string; isLoading: boolean; error: Error | null } {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const folder = type === "daily" ? "日报" : "周报";
    // TODO: implement local report content reading via API
    setContent("");
    setIsLoading(false);

    return () => {
      cancelled = true;
    };
  }, [type, slug]);

  return { content, isLoading, error };
}
