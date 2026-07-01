"use client";

import { useEffect, useState } from "react";

import { formatLocalISO } from "@/lib/date-utils";

export function useActivityTrend() {
  const [days, setDays] = useState<
    Array<{ date: string; totalMinutes: number; idleMinutes: number; awayMinutes: number }>
  >([]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.queryActivityRange) return;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    api.queryActivityRange(formatLocalISO(start), formatLocalISO(end)).then(setDays).catch(() => {});
  }, []);

  return days;
}
