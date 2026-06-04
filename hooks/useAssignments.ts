"use client";

import { useEffect } from "react";
import { useAssignmentsStore } from "@/store/assignments";
import { useGitHubClient } from "./useGitHubClient";
import type { AssignmentDraft } from "@/types";

export function useAssignments() {
  const client = useGitHubClient();
  const { assignments, isLoading, error, undoBuffer, load, add, markDone, undo } =
    useAssignmentsStore();

  useEffect(() => {
    if (client) {
      load(client);
    }
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    assignments,
    isLoading,
    error,
    undoBuffer,
    add: async (draft: AssignmentDraft) => {
      if (client) await add(draft, client);
    },
    markDone: async (id: string) => {
      if (client) await markDone(id, client);
    },
    undo: async () => {
      if (client) await undo(client);
    },
    reload: () => {
      if (client) load(client);
    },
  };
}
