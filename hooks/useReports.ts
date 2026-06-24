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

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/local-data?type=dailyReports&${getAuthParams()}`, { signal });
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
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
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

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/local-data?type=weeklyReports&${getAuthParams()}`, { signal });
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
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  return { entries, isLoading, error, reload: load };
}

/**
 * 获取指定日期的日报 — 从本地 API 读取
 */
export function useDailyReport(
  date: string
): { content: string; isLoading: boolean; error: Error | null; reload: () => void } {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!date) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setContent("");

    fetch(`/api/local-data?type=dailyReport&date=${encodeURIComponent(date)}&${getAuthParams()}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(`加载失败 (${res.status})`);
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
  }, [date, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return { content, isLoading, error, reload };
}

interface WeeklyReportData {
  content: string;
  theme?: string;
  ai?: boolean;
  generatedAt?: number;
}

/**
 * 获取单篇报告内容 — 从本地 API 读取
 */
export function useReportContent(
  type: "daily" | "weekly",
  slug: string
): { content: string; theme?: string; ai?: boolean; generatedAt?: number; isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<{ content: string; theme?: string; ai?: boolean; generatedAt?: number }>({
    content: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData({ content: "" });

    const reportType = type === "daily" ? "dailyReport" : "weeklyReport";
    const paramName = type === "daily" ? "date" : "slug";
    const url = `/api/local-data?type=${reportType}&${paramName}=${encodeURIComponent(slug)}&${getAuthParams()}`;

    fetch(url)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error("加载失败");
        const raw = (await res.json()) as string | WeeklyReportData;
        if (typeof raw === "string") {
          setData({ content: raw });
        } else if (raw && typeof raw === "object" && typeof raw.content === "string") {
          setData(raw);
        } else {
          setData({ content: "" });
        }
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

  return { ...data, isLoading, error };
}
