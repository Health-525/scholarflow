"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardSummary } from "@/lib/dashboard/summary";

export function useDashboardSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/local-data?type=dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard summary");
      return (await res.json()) as DashboardSummary;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return { data: data ?? null, loading: isLoading, error: error as Error | null };
}
