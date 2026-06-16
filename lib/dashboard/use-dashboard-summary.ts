"use client";

import { useEffect, useState } from "react";

import type { DashboardSummary } from "@/lib/dashboard/summary";

export function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/local-data?type=dashboard")
      .then((r) => r.json())
      .then((d: DashboardSummary) => { setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
