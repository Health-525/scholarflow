"use client";

import { useState, useEffect, useCallback } from "react";

import { getAuthParams } from "@/lib/api/auth-params";
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
      const res = await fetch(`/api/local-data?type=dailyReports&${getAuthParams()}`);
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
      const res = await fetch(`/api/local-data?type=weeklyReports&${getAuthParams()}`);
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
    setContent("");

    const reportType = type === "daily" ? "dailyReport" : "weeklyReport";
    const paramName = type === "daily" ? "date" : "slug";
    const url = `/api/local-data?type=${reportType}&${paramName}=${encodeURIComponent(slug)}&${getAuthParams()}`;

    fetch(url)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error("加载失败");
        const data = (await res.json()) as string;
        setContent(typeof data === "string" ? data : "");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, slug]);

  return { content, isLoading, error };
}
