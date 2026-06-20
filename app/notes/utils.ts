import { parseNotePath } from "@/lib/note-utils";
import type { NoteTreeNode } from "@/types";

export interface NoteListItem {
  path: string;
  title: string;
  category: string;
}

export interface DeletedNote {
  path: string;
  content: string;
  expiresAt: number;
}

export const SAMPLE_NOTE = {
  title: "欢迎使用笔记",
  category: "示例",
  content: "# 欢迎使用笔记\n\n这里可以记录课堂重点、复习提纲或任何想法。\n\n- 支持 Markdown 格式\n- 自动保存\n- 左侧可搜索笔记\n\n右侧会实时显示最终效果。",
};

export function flattenTree(nodes: NoteTreeNode[]): NoteListItem[] {
  const result: NoteListItem[] = [];
  function walk(list: NoteTreeNode[], parentCategory: string) {
    for (const node of list) {
      if (node.type === "file") {
        const parsed = parseNotePath(node.path);
        result.push({ path: node.path, title: parsed.title, category: parentCategory });
      }
      if (node.children && node.children.length > 0) {
        walk(node.children, node.type === "dir" ? node.name : parentCategory);
      }
    }
  }
  walk(nodes, "");
  return result;
}
