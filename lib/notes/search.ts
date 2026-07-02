import { getServerDB } from "@/lib/server-db";

const FTS_TABLE = "notes_fts";

/** 用于 snippet() 高亮边界的不可见控制字符，避免与用户内容冲突。 */
const START_MARK = "\u0001";
const END_MARK = "\u0002";

function ensureFtsTable(): void {
  const db = getServerDB().getRawDB();
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE}
    USING fts5(key, content, tokenize='unicode61');
  `);
}

/** 转义 FTS5 查询中的双引号，防止查询语法被注入或报错。 */
function sanitizeFtsQuery(query: string): string {
  return query.replace(/"/g, '""').trim();
}

export function indexNote(key: string, content: string): void {
  ensureFtsTable();
  const db = getServerDB().getRawDB();
  db.prepare(`DELETE FROM ${FTS_TABLE} WHERE key = ?`).run(key);
  db.prepare(`INSERT INTO ${FTS_TABLE} (key, content) VALUES (?, ?)`).run(key, content);
}

export function unindexNote(key: string): void {
  ensureFtsTable();
  const db = getServerDB().getRawDB();
  db.prepare(`DELETE FROM ${FTS_TABLE} WHERE key = ?`).run(key);
}

export interface FtsSearchRow {
  key: string;
  snippet: string;
  rank: number;
}

function escapeSnippet(snippet: string): string {
  // 先转义原始 HTML，再把 FTS 高亮标记还原为安全标签
  return snippet
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(new RegExp(START_MARK, "g"), "<mark>")
    .replace(new RegExp(END_MARK, "g"), "</mark>");
}

export function searchNotes(prefix: string, query: string, limit = 20): FtsSearchRow[] {
  ensureFtsTable();
  const db = getServerDB().getRawDB();
  const pattern = `note:${prefix}:%`;
  const safeQuery = sanitizeFtsQuery(query);
  const rows = db.prepare(`
    SELECT f.key,
           snippet(${FTS_TABLE}, 1, '${START_MARK}', '${END_MARK}', '...', 40) AS snippet,
           rank
    FROM ${FTS_TABLE} f
    WHERE f.content MATCH ?
      AND f.key LIKE ?
    ORDER BY rank
    LIMIT ?
  `).all(safeQuery, pattern, limit) as FtsSearchRow[];

  return rows.map((row) => ({
    ...row,
    snippet: escapeSnippet(row.snippet),
  }));
}
