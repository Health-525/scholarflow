import { create } from "zustand";
import type { Assignment, AssignmentDraft, AssignmentsFile } from "@/types";
import type { GitHubError } from "@/lib/github/errors";
import type { GitHubClient } from "@/lib/github/client";
import { buildAssignment, sortAssignments } from "@/lib/assignment-utils";
import { toGitHubError } from "@/lib/github/errors";

const FILE_PATH = "data/assignments.json";
const UNDO_TIMEOUT_MS = 10_000;

interface AssignmentsState {
  assignments: Assignment[];
  isLoading: boolean;
  error: GitHubError | null;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;

  load: (client: GitHubClient) => Promise<void>;
  add: (draft: AssignmentDraft, client: GitHubClient) => Promise<void>;
  markDone: (id: string, client: GitHubClient) => Promise<void>;
  undo: (client: GitHubClient) => Promise<void>;
}

export const useAssignmentsStore = create<AssignmentsState>((set, get) => ({
  assignments: [],
  isLoading: false,
  error: null,
  undoBuffer: null,

  async load(client: GitHubClient) {
    set({ isLoading: true, error: null });
    try {
      const file = await client.getFile("execution", FILE_PATH);
      const data = JSON.parse(file.content) as AssignmentsFile;
      set({ assignments: sortAssignments(data.assignments || []), isLoading: false });
    } catch (err) {
      set({ error: toGitHubError(err), isLoading: false });
    }
  },

  async add(draft: AssignmentDraft, client: GitHubClient) {
    const newAssignment = buildAssignment(draft);
    const current = get().assignments;
    const updated = sortAssignments([...current, newAssignment]);

    // Optimistic update
    set({ assignments: updated, error: null });

    try {
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", FILE_PATH, content, "添加作业");
    } catch (err) {
      // Rollback
      set({ assignments: current, error: toGitHubError(err) });
    }
  },

  async markDone(id: string, client: GitHubClient) {
    const current = get().assignments;
    const target = current.find((a) => a.id === id);
    if (!target) return;

    const updated = current.map((a) =>
      a.id === id ? { ...a, done: true, completedAt: new Date().toISOString() } : a
    );

    // Store in undo buffer
    set({
      assignments: sortAssignments(updated),
      undoBuffer: { assignment: target, expiresAt: Date.now() + UNDO_TIMEOUT_MS },
      error: null,
    });

    try {
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", FILE_PATH, content, "完成作业");
    } catch (err) {
      // Rollback
      set({ assignments: current, undoBuffer: null, error: toGitHubError(err) });
    }
  },

  async undo(client: GitHubClient) {
    const { undoBuffer, assignments } = get();
    if (!undoBuffer || Date.now() > undoBuffer.expiresAt) {
      set({ undoBuffer: null });
      return;
    }

    const { assignment } = undoBuffer;
    // Restore: remove completedAt, set done=false
    const restored: Assignment = {
      ...assignment,
      done: false,
      completedAt: undefined,
    };

    const updated = sortAssignments(
      assignments.map((a) => (a.id === assignment.id ? restored : a))
    );

    set({ assignments: updated, undoBuffer: null, error: null });

    try {
      const content = JSON.stringify({ assignments: updated }, null, 2);
      await client.putFile("execution", FILE_PATH, content, "撤销完成");
    } catch (err) {
      // Rollback undo
      set({
        assignments,
        undoBuffer,
        error: toGitHubError(err),
      });
    }
  },
}));
