"use client";

import { useMemo } from "react";

import { GitHubClient } from "@/lib/github/client";
import { useAuthStore } from "@/store/auth";

/**
 * 从 auth store 读取 token，返回 GitHubClient 实例
 */
export function useGitHubClient(): GitHubClient | null {
  const token = useAuthStore((s) => s.token);

  return useMemo(() => {
    if (!token) return null;
    return new GitHubClient({ token });
  }, [token]);
}
