/**
 * ScholarFlow Server Database — SQLite (better-sqlite3)
 *
 * 替代 timetable 文件系统 + GitHub API 作为数据存储层。
 * 使用 key-value 模式存储 JSON 数据，兼容现有前端解析逻辑。
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Schema ──────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS data_store (
    key   TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credentials (
    school_id  TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    credential_data TEXT NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (school_id, user_id)
  );
`;

// ── Singleton ───────────────────────────────────────────────

let dbInstance: ServerDB | null = null;

export function getServerDB(): ServerDB {
  if (!dbInstance) {
    dbInstance = new ServerDB();
  }
  return dbInstance;
}

export function resetServerDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ── ServerDB Class ──────────────────────────────────────────

export class ServerDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || this.resolveDbPath();
    // Ensure directory exists
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.exec(SCHEMA);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
  }

  private resolveDbPath(): string {
    // Electron: use userData directory (detected via ELECTRON_DEV env)
    // Server: use project data directory
    const baseDir = process.env.ELECTRON_DEV
      ? process.cwd()
      : process.cwd();
    return path.join(baseDir, "data", "scholarflow.db");
  }

  // ── Data Store (替代 timetable 文件系统) ──────────────────

  /**
   * 读取数据 — 替代 fs.readFileSync(timetable/data/*.json)
   * key 映射: "schedule" → timetable/data/schedule.json
   */
  readData(key: string): unknown | null {
    const row = this.db
      .prepare("SELECT content FROM data_store WHERE key = ?")
      .get(key) as { content: string } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.content);
    } catch {
      return row.content; // 非 JSON 内容直接返回
    }
  }

  /**
   * 写入数据 — 替代 fs.writeFileSync + git commit
   */
  writeData(key: string, content: unknown): void {
    const json = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    this.db
      .prepare(
        "INSERT OR REPLACE INTO data_store (key, content, updated_at) VALUES (?, ?, ?)"
      )
      .run(key, json, Date.now());
  }

  /**
   * 删除数据
   */
  deleteData(key: string): boolean {
    const result = this.db
      .prepare("DELETE FROM data_store WHERE key = ?")
      .run(key);
    return result.changes > 0;
  }

  /**
   * 按前缀删除数据 — 用于退出登录时清理用户数据
   * prefix 格式: "njtech:202321144057" → 删除所有 key LIKE "xxx:njtech:202321144057"
   */
  deleteDataByPrefix(prefix: string): number {
    const result = this.db
      .prepare("DELETE FROM data_store WHERE key LIKE ?")
      .run(`%:${prefix}`);
    return result.changes;
  }

  /**
   * 查找所有有效凭证 — 用于 session 路由发现当前登录用户
   */
  findActiveCredentials(): { schoolId: string; userId: string; username: string } | null {
    const row = this.db
      .prepare(
        "SELECT school_id, user_id, credential_data FROM credentials WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(Date.now()) as { school_id: string; user_id: string; credential_data: string } | undefined;

    if (!row) return null;
    try {
      const data = JSON.parse(row.credential_data) as Record<string, string>;
      return { schoolId: row.school_id, userId: row.user_id, username: data.username || row.user_id };
    } catch {
      return { schoolId: row.school_id, userId: row.user_id, username: row.user_id };
    }
  }

  /**
   * 列出所有数据 key
   */
  listKeys(): string[] {
    const rows = this.db
      .prepare("SELECT key FROM data_store ORDER BY key")
      .all() as { key: string }[];
    return rows.map((r) => r.key);
  }

  /**
   * 获取数据更新时间
   */
  getUpdatedAt(key: string): number | null {
    const row = this.db
      .prepare("SELECT updated_at FROM data_store WHERE key = ?")
      .get(key) as { updated_at: number } | undefined;
    return row?.updated_at ?? null;
  }

  // ── Credentials Store (替代 GitHub PAT 存储) ──────────────

  /**
   * 保存学校凭证
   */
  saveCredentials(
    schoolId: string,
    userId: string,
    data: Record<string, string>,
    expiresAt?: number
  ): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO credentials (school_id, user_id, credential_data, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(schoolId, userId, JSON.stringify(data), expiresAt ?? null, Date.now());
  }

  /**
   * 获取学校凭证 — 自动检查过期
   */
  getCredentials(
    schoolId: string,
    userId: string
  ): Record<string, string> | null {
    const row = this.db
      .prepare(
        "SELECT credential_data, expires_at FROM credentials WHERE school_id = ? AND user_id = ?"
      )
      .get(schoolId, userId) as {
      credential_data: string;
      expires_at: number | null;
    } | undefined;

    if (!row) return null;
    // 检查过期
    if (row.expires_at && Date.now() > row.expires_at) return null;
    try {
      return JSON.parse(row.credential_data);
    } catch {
      return null;
    }
  }

  /**
   * 删除凭证
   */
  deleteCredentials(schoolId: string, userId: string): boolean {
    const result = this.db
      .prepare(
        "DELETE FROM credentials WHERE school_id = ? AND user_id = ?"
      )
      .run(schoolId, userId);
    return result.changes > 0;
  }

  // ── Utility ───────────────────────────────────────────────

  /**
   * 清理过期缓存数据
   */
  cleanExpiredData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare("DELETE FROM data_store WHERE updated_at < ?")
      .run(cutoff);
    return result.changes;
  }

  /**
   * 获取数据库文件大小（字节）
   */
  getDbSize(): number {
    const dbPath = this.resolveDbPath();
    try {
      const stat = fs.statSync(dbPath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}
