import { create } from "zustand";
import type { RunRecord, RunningFile } from "@/types";
import type { GitHubError } from "@/lib/github/errors";
import type { GitHubClient } from "@/lib/github/client";
import { toGitHubError } from "@/lib/github/errors";

const FILE_PATH = "data/running.json";

interface RunningState {
  records: RunRecord[];
  isLoading: boolean;
  error: GitHubError | null;

  load: (client: GitHubClient) => Promise<void>;
  addRecord: (record: Omit<RunRecord, "createdAt">, client: GitHubClient) => Promise<void>;
}

export const useRunningStore = create<RunningState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,

  async load(client: GitHubClient) {
    set({ isLoading: true, error: null });
    try {
      const file = await client.getFile("execution", FILE_PATH);
      const data = JSON.parse(file.content) as RunningFile;
      set({ records: data.records || [], isLoading: false });
    } catch (err) {
      set({ error: toGitHubError(err), isLoading: false });
    }
  },

  async addRecord(record: Omit<RunRecord, "createdAt">, client: GitHubClient) {
    const newRecord: RunRecord = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    const current = get().records;
    const updated = [...current, newRecord];

    // Optimistic update
    set({ records: updated, error: null });

    try {
      const content = JSON.stringify({ records: updated }, null, 2);
      await client.putFile("execution", FILE_PATH, content, "记录跑步");
    } catch (err) {
      // Rollback
      set({ records: current, error: toGitHubError(err) });
    }
  },
}));
