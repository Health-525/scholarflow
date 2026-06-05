"use client";

import { useState, useEffect, useCallback } from "react";
import { useGitHubClient } from "./useGitHubClient";
import type { GitHubError } from "@/lib/github/errors";

export interface JwcNewsItem {
  title: string;
  url: string;
  date: string;
  category: string;
}

interface JwcNewsData {
  fetchedAt: string;
  source: string;
  count: number;
  items: JwcNewsItem[];
}

interface UseJwcNewsResult {
  items: JwcNewsItem[];
  fetchedAt: string;
  isLoading: boolean;
  error: GitHubError | null;
  reload: () => void;
}

export function useJwcNews(limit = 8): UseJwcNewsResult {
  const client = useGitHubClient();
  const [data, setData] = useState<JwcNewsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const file = await client.getFile("content", "_data/jwc_news.json");
      const parsed: JwcNewsData = JSON.parse(file.content);
      setData(parsed);
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items: (data?.items ?? []).slice(0, limit),
    fetchedAt: data?.fetchedAt ?? "",
    isLoading,
    error,
    reload: load,
  };
}
