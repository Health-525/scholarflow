import { getServerDB } from "@/lib/server-db";
import type { NoteTreeNode } from "@/types";

import { saveVersion } from "./history";
import { indexNote, unindexNote } from "./search";
import { removeTagsForNote } from "./tags";

const NOTE_KEY_PREFIX = "note";

function noteKey(prefix: string, path: string): string {
  return `${NOTE_KEY_PREFIX}:${prefix}:${path}`;
}

/**
 * 列出某账号下的所有笔记路径
 */
export function listNotePaths(prefix: string): string[] {
  const db = getServerDB();
  const pattern = `${NOTE_KEY_PREFIX}:${prefix}:`;
  return db
    .listKeys()
    .filter((key) => key.startsWith(pattern))
    .map((key) => key.slice(pattern.length));
}

/**
 * 读取单篇笔记内容
 */
export function readNote(prefix: string, path: string): string | null {
  const db = getServerDB();
  const raw = db.readData(noteKey(prefix, path));
  if (raw === null) return null;
  return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
}

/**
 * 读取单篇笔记的最后更新时间（ms）
 */
export function getNoteUpdatedAt(prefix: string, path: string): number | null {
  const db = getServerDB();
  return db.getUpdatedAt(noteKey(prefix, path));
}

export function getNoteUpdatedAtForPaths(prefix: string, paths: string[]): Map<string, number> {
  const result = new Map<string, number>();
  if (paths.length === 0) return result;
  const db = getServerDB();
  const placeholders = paths.map(() => "?").join(",");
  const keys = paths.map((p) => noteKey(prefix, p));
  const rows = db
    .getRawDB()
    .prepare(`SELECT key, updated_at FROM data_store WHERE key IN (${placeholders})`)
    .all(...keys) as { key: string; updated_at: number }[];
  const prefixLen = noteKey(prefix, "").length;
  for (const row of rows) {
    result.set(row.key.slice(prefixLen), row.updated_at);
  }
  return result;
}

/**
 * 保存笔记（新建或更新）
 */
export function writeNote(prefix: string, path: string, content: string): void {
  const db = getServerDB();
  const oldContent = readNote(prefix, path);
  if (oldContent !== null && oldContent !== content) {
    saveVersion(prefix, path, oldContent);
  }
  db.writeData(noteKey(prefix, path), content);
  indexNote(noteKey(prefix, path), content);
}

/**
 * 删除笔记
 */
export function deleteNote(prefix: string, path: string): boolean {
  const db = getServerDB();
  const result = db.deleteData(noteKey(prefix, path));
  if (result) {
    unindexNote(noteKey(prefix, path));
    removeTagsForNote(prefix, path);
  }
  return result;
}

/**
 * 重命名笔记
 */
export function renameNote(prefix: string, oldPath: string, newPath: string): boolean {
  const content = readNote(prefix, oldPath);
  if (content === null) return false;
  writeNote(prefix, newPath, content);
  return deleteNote(prefix, oldPath);
}

/**
 * 根据路径列表构建目录树
 */
export function buildNoteTree(paths: string[], updatedAtMap?: Map<string, number>): NoteTreeNode[] {
  const root: NoteTreeNode = { name: "", path: "", type: "dir", children: [] };

  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let current = root;
    let builtPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      builtPath = builtPath ? `${builtPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let child = current.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: builtPath,
          type: isFile ? "file" : "dir",
          updatedAt: isFile ? updatedAtMap?.get(path) ?? undefined : undefined,
          children: isFile ? undefined : [],
        };
        current.children!.push(child);
      } else if (isFile && child.type === "dir") {
        // 同名文件与目录冲突：保留目录，附加文件节点（极少见）
        child = {
          name: part,
          path: builtPath,
          type: "file",
          updatedAt: updatedAtMap?.get(path) ?? undefined,
        };
        current.children!.push(child);
      }

      if (!isFile) {
        current = child;
      }
    }
  }

  return sortNoteTree(root.children || []);
}

function sortNoteTree(nodes: NoteTreeNode[]): NoteTreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    })
    .map((node) =>
      node.type === "dir" && node.children
        ? { ...node, children: sortNoteTree(node.children) }
        : node
    );
}
