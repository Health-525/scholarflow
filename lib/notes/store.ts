import { getServerDB } from "@/lib/server-db";
import type { NoteTreeNode } from "@/types";

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
 * 保存笔记（新建或更新）
 */
export function writeNote(prefix: string, path: string, content: string): void {
  const db = getServerDB();
  db.writeData(noteKey(prefix, path), content);
}

/**
 * 删除笔记
 */
export function deleteNote(prefix: string, path: string): boolean {
  const db = getServerDB();
  return db.deleteData(noteKey(prefix, path));
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
export function buildNoteTree(paths: string[]): NoteTreeNode[] {
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
          children: isFile ? undefined : [],
        };
        current.children!.push(child);
      } else if (isFile && child.type === "dir") {
        // 同名文件与目录冲突：保留目录，附加文件节点（极少见）
        child = {
          name: part,
          path: builtPath,
          type: "file",
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
