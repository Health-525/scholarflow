import { getServerDB } from "@/lib/server-db";

const FTS_TABLE = "notes_fts";

function ensureFtsTable(): void {
  const db = getServerDB().getRawDB();
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE}
    USING fts5(key, content, tokenize='unicode61');
  `);
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

export function searchNotes(prefix: string, query: string, limit = 20): FtsSearchRow[] {
  ensureFtsTable();
  const db = getServerDB().getRawDB();
  const pattern = `note:${prefix}:%`;
  return db.prepare(`
    SELECT f.key,
           snippet(${FTS_TABLE}, 1, '<mark>', '</mark>', '...', 40) AS snippet,
           rank
    FROM ${FTS_TABLE} f
    WHERE f.content MATCH ?
      AND f.key LIKE ?
    ORDER BY rank
    LIMIT ?
  `).all(query, pattern, limit) as FtsSearchRow[];
}
