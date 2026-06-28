import { getServerDB } from "@/lib/server-db";
import type { NoteHistoryEntry } from "@/types";

const MAX_VERSIONS = 50;

function historyKey(prefix: string, notePath: string, versionIndex: number): string {
  return `note-history:${prefix}:${notePath}:${versionIndex}`;
}

function historyMetaKey(prefix: string, notePath: string): string {
  return `note-history-meta:${prefix}:${notePath}`;
}

export function saveVersion(prefix: string, notePath: string, content: string): void {
  const db = getServerDB();
  const meta = db.readData(historyMetaKey(prefix, notePath)) as { nextIndex: number } | null;
  const nextIndex = meta?.nextIndex ?? 0;
  db.writeData(historyKey(prefix, notePath, nextIndex), {
    content,
    savedAt: Date.now(),
    versionIndex: nextIndex,
  });
  db.writeData(historyMetaKey(prefix, notePath), { nextIndex: nextIndex + 1 });
  pruneOldVersions(prefix, notePath);
}

export function getHistory(prefix: string, notePath: string): NoteHistoryEntry[] {
  const db = getServerDB();
  const meta = db.readData(historyMetaKey(prefix, notePath)) as { nextIndex: number } | null;
  if (!meta) return [];
  const entries: NoteHistoryEntry[] = [];
  for (let i = meta.nextIndex - 1; i >= 0 && entries.length < MAX_VERSIONS; i--) {
    const raw = db.readData(historyKey(prefix, notePath, i));
    if (raw && typeof raw === "object") {
      entries.push(raw as NoteHistoryEntry);
    }
  }
  return entries;
}

export function getVersion(prefix: string, notePath: string, versionIndex: number): NoteHistoryEntry | null {
  const db = getServerDB();
  const raw = db.readData(historyKey(prefix, notePath, versionIndex));
  if (raw && typeof raw === "object") return raw as NoteHistoryEntry;
  return null;
}

export function deleteHistory(prefix: string, notePath: string): void {
  const db = getServerDB();
  const meta = db.readData(historyMetaKey(prefix, notePath)) as { nextIndex: number } | null;
  if (!meta) return;
  for (let i = 0; i < meta.nextIndex; i++) {
    db.deleteData(historyKey(prefix, notePath, i));
  }
  db.deleteData(historyMetaKey(prefix, notePath));
}

function pruneOldVersions(prefix: string, notePath: string): void {
  const db = getServerDB();
  const meta = db.readData(historyMetaKey(prefix, notePath)) as { nextIndex: number } | null;
  if (!meta || meta.nextIndex <= MAX_VERSIONS) return;
  const oldest = meta.nextIndex - MAX_VERSIONS;
  for (let i = 0; i < oldest; i++) {
    db.deleteData(historyKey(prefix, notePath, i));
  }
}
