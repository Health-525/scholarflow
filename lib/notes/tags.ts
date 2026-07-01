import { getServerDB } from "@/lib/server-db";
import type { TagInfo } from "@/types";

const TAG_PREFIX = "note-tag";

function tagKey(prefix: string, path: string): string {
  return `${TAG_PREFIX}:${prefix}:${path}`;
}

export function getTags(prefix: string, path: string): string[] {
  const db = getServerDB();
  const raw = db.readData(tagKey(prefix, path));
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

export function getTagsForPaths(prefix: string, paths: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (paths.length === 0) return result;
  const db = getServerDB();
  const placeholders = paths.map(() => "?").join(",");
  const keys = paths.map((p) => tagKey(prefix, p));
  const rows = db
    .getRawDB()
    .prepare(`SELECT key, content FROM data_store WHERE key IN (${placeholders})`)
    .all(...keys) as { key: string; content: string }[];
  const prefixLen = tagKey(prefix, "").length;
  for (const row of rows) {
    const path = row.key.slice(prefixLen);
    try {
      const parsed = JSON.parse(row.content) as string[];
      result.set(path, Array.isArray(parsed) ? parsed : []);
    } catch {
      result.set(path, []);
    }
  }
  return result;
}

export function setTags(prefix: string, path: string, tags: string[]): void {
  const db = getServerDB();
  const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  db.writeData(tagKey(prefix, path), normalized);
}

export function listAllTags(prefix: string): TagInfo[] {
  const db = getServerDB();
  const pattern = `${TAG_PREFIX}:${prefix}:`;
  const tagCounts = new Map<string, number>();
  for (const key of db.listKeys()) {
    if (!key.startsWith(pattern)) continue;
    const raw = db.readData(key);
    if (!Array.isArray(raw)) continue;
    for (const tag of raw as string[]) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function removeTagsForNote(prefix: string, path: string): void {
  const db = getServerDB();
  db.deleteData(tagKey(prefix, path));
}
