import { parseNotePath } from "@/lib/note-utils";
import type { NoteTreeNode } from "@/types";

export interface NoteListItem {
  path: string;
  title: string;
  category: string;
  updatedAt: number;
  pinned?: boolean;
}

export interface DeletedNote {
  path: string;
  content: string;
  expiresAt: number;
}

export function flattenTree(nodes: NoteTreeNode[]): NoteListItem[] {
  const result: NoteListItem[] = [];
  function walk(list: NoteTreeNode[], parentCategory: string) {
    for (const node of list) {
      if (node.type === "file") {
        const parsed = parseNotePath(node.path);
        result.push({
          path: node.path,
          title: parsed.title,
          category: parentCategory,
          updatedAt: node.updatedAt ?? 0,
          pinned: node.pinned,
        });
      }
      if (node.children && node.children.length > 0) {
        walk(node.children, node.type === "dir" ? node.name : parentCategory);
      }
    }
  }
  walk(nodes, "");
  return result;
}
