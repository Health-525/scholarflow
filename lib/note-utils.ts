/**
 * 笔记路径工具：把用户友好的「标题 + 分类」映射为底层文件路径。
 * 屏蔽路径概念，让新手只关心「写什么」而不是「存在哪」。
 */

export interface NotePathInfo {
  category: string;
  title: string;
}

const INVALID_FILE_CHARS = /[\\/:*?"<>|]/g;
const MULTIPLE_SPACES = /\s+/g;

function slugify(input: string): string {
  return input
    .trim()
    .replace(INVALID_FILE_CHARS, "")
    .replace(MULTIPLE_SPACES, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureMd(name: string): string {
  return name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
}

/**
 * 根据标题和可选分类生成笔记文件路径。
 * 标题为空时使用 "untitled"。
 */
export function buildNotePath(title: string, category?: string): string {
  const fileName = ensureMd(slugify(title) || "untitled");
  const cat = category ? slugify(category) : "";
  return cat ? `${cat}/${fileName}` : fileName;
}

/**
 * 把底层路径解析回用户视角的标题与分类。
 */
export function parseNotePath(path: string): NotePathInfo {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  const fileName = parts.pop() ?? path;
  const title = fileName.replace(/\.md$/i, "");
  const category = parts.join("/");
  return { category, title };
}
