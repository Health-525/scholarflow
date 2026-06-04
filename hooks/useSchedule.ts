"use client";

import { useState, useEffect, useCallback } from "react";
import { useGitHubClient } from "./useGitHubClient";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import { parseSchedule } from "@/lib/schedule/schedule";
import type { Adjustment } from "@/lib/schedule/adjustments";
import type { GitHubError } from "@/lib/github/errors";

interface ScheduleState {
  schedule: RawScheduleData | null;
  adjustments: Adjustment[];
  isLoading: boolean;
  error: GitHubError | null;
  reload: () => void;
}

export function useSchedule(): ScheduleState {
  const client = useGitHubClient();
  const [schedule, setSchedule] = useState<RawScheduleData | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);

    try {
      const [scheduleFile, adjustmentsFile] = await Promise.allSettled([
        client.getFile("execution", "data/schedule.json"),
        client.getFile("execution", "data/adjustments.json"),
      ]);

      if (scheduleFile.status === "fulfilled") {
        const raw = JSON.parse(scheduleFile.value.content);
        setSchedule(parseSchedule(raw));
      } else {
        setError(scheduleFile.reason as GitHubError);
      }

      if (adjustmentsFile.status === "fulfilled") {
        const raw = JSON.parse(adjustmentsFile.value.content);
        setAdjustments(Array.isArray(raw) ? raw : raw.adjustments ?? []);
      }
      // Adjustments file missing is not fatal
    } catch (err) {
      setError(err as GitHubError);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return { schedule, adjustments, isLoading, error, reload: load };
}
