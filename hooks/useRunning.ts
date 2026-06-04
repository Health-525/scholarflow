"use client";

import { useEffect } from "react";
import { useRunningStore } from "@/store/running";
import { useGitHubClient } from "./useGitHubClient";
import type { RunType } from "@/types";

export function useRunning() {
  const client = useGitHubClient();
  const { records, isLoading, error, load, addRecord } = useRunningStore();

  useEffect(() => {
    if (client) {
      load(client);
    }
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    records,
    isLoading,
    error,
    addRecord: async (date: string, type: RunType) => {
      if (client) await addRecord({ date, type }, client);
    },
    reload: () => {
      if (client) load(client);
    },
  };
}
