/**
 * ScholarFlow Server Database — better-sqlite3 存储引擎
 *
 * 底层存储为 SQLite 文件 `scholarflow.db`(经 `better-sqlite3`),
 * 在保持 ServerDB 公开 API 签名完全不变的前提下消除并发写损坏与全文件重写问题。
 * 保留 key-value + credentials 的 API,兼容现有路由和前端。
 */

import fs from "fs";
import path from "path";

import type Database from "better-sqlite3";

import { getLegacyBaseDirs, discoverLegacyCandidates, ensureMigrated } from "./data-migrate";
import { resolveDataDir } from "./server-db/path";
import { escapeLike, openSqlite } from "./server-db/utils";

// ── Schema ──────────────────────────────────────────────────

const CURRENT_VERSION = 1;

// ── Singleton ───────────────────────────────────────────────

let dbInstance: ServerDB | null = null;

export function getServerDB(): ServerDB {
  if (!dbInstance) {
    dbInstance = new ServerDB();
  }
  return dbInstance;
}

// ── ServerDB Class ──────────────────────────────────────────

export class ServerDB {
  private storePath: string;
  private db: Database.Database;
  private stmts!: Record<string, Database.Statement>;

  constructor(dbPath?: string) {
    this.storePath = dbPath || this.resolveDbPath();
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    // eslint-disable-next-line no-console
    console.log("[ServerDB] store path:", this.storePath); // 绝对路径 (R2.6)

    this.db = openSqlite(this.storePath); // R4.5: try/catch 包裹
    // 限制数据库文件权限为仅属主读写，防止同机其他应用读取明文数据
    try {
      fs.chmodSync(this.storePath, 0o600);
    } catch {
      // Windows 不支持 chmod，静默忽略
    }
    this.applyPragmas();
    this.createTables();
    this.prepareStatements();
    this.ensureSchemaVersion();

    // 一次性 Legacy_JSON_Data → SQLite 迁移(建表后、对外服务前)。
    // ensureMigrated 内部已保证幂等(db 非空跳过)与失败安全;此处再以 try/catch
    // 兜底任何意外异常,仅记录日志,绝不阻断启动 (R2.6, R5.3-R5.6)。
    try {
      const candidates = discoverLegacyCandidates(getLegacyBaseDirs(this.storePath));
      ensureMigrated(this.db, this.storePath, candidates);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ServerDB] migration skipped:", (e as Error).message);
    }
  }

  private resolveDbPath(): string {
    return path.join(resolveDataDir(), "scholarflow.db");
  }

  // ── Initialization ─────────────────────────────────────────

  private applyPragmas(): void {
    this.db.pragma("journal_mode = WAL"); // 写前日志:读写并发不互斥,降低损坏风险
    this.db.pragma("synchronous = NORMAL"); // WAL 下兼顾性能与持久性
    this.db.pragma("busy_timeout = 5000"); // 并发写争用时等待而非立即报错
    this.db.pragma("foreign_keys = ON");
  }

  private createTables(): void {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS data_store (
        key        TEXT PRIMARY KEY,
        content    TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS credentials (
        school_id       TEXT NOT NULL,
        user_id         TEXT NOT NULL,
        credential_data TEXT NOT NULL,
        expires_at      INTEGER,
        created_at      INTEGER NOT NULL,
        PRIMARY KEY (school_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );`
    );
  }

  private ensureSchemaVersion(): void {
    const row = this.db
      .prepare("SELECT version FROM schema_version LIMIT 1")
      .get() as { version: number } | undefined;
    if (!row) {
      this.db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(CURRENT_VERSION);
    }
  }

  private prepareStatements(): void {
    this.stmts = {
      get: this.db.prepare("SELECT content, updated_at FROM data_store WHERE key = ?"),
      upsert: this.db.prepare(
        "INSERT INTO data_store (key, content, updated_at) VALUES (@key, @content, @ts) " +
          "ON CONFLICT(key) DO UPDATE SET content = @content, updated_at = @ts"
      ),
      del: this.db.prepare("DELETE FROM data_store WHERE key = ?"),
      delPrefix: this.db.prepare("DELETE FROM data_store WHERE key LIKE ? ESCAPE '\\'"),
      listKeys: this.db.prepare("SELECT key FROM data_store ORDER BY key ASC"),
      updatedAt: this.db.prepare("SELECT updated_at FROM data_store WHERE key = ?"),
      cleanOld: this.db.prepare("DELETE FROM data_store WHERE updated_at < ?"),
      credUpsert: this.db.prepare(
        "INSERT INTO credentials (school_id, user_id, credential_data, expires_at, created_at) " +
          "VALUES (@school_id, @user_id, @credential_data, @expires_at, @created_at) " +
          "ON CONFLICT(school_id, user_id) DO UPDATE SET " +
          "credential_data = @credential_data, expires_at = @expires_at, created_at = @created_at"
      ),
      credGet: this.db.prepare("SELECT * FROM credentials WHERE school_id = ? AND user_id = ?"),
      credDel: this.db.prepare("DELETE FROM credentials WHERE school_id = ? AND user_id = ?"),
      credActive: this.db.prepare(
        "SELECT * FROM credentials WHERE expires_at IS NULL OR expires_at > ? " +
          "ORDER BY created_at DESC LIMIT 1"
      ),
      credRecent: this.db.prepare(
        "SELECT * FROM credentials ORDER BY created_at DESC LIMIT 1"
      ),
    };
  }

  // ── Data Store ─────────────────────────────────────────────

  readData(key: string): unknown | null {
    const row = this.stmts.get.get(key) as { content: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.content);
    } catch {
      // eslint-disable-next-line no-console
      console.error("[ServerDB] JSON parse failed for key:", key);
      return row.content;
    }
  }

  writeData(key: string, content: unknown): void {
    // content 存 JSON 字符串(兼容 readData 的 JSON.parse);单行 upsert,不再全文件重写 (R3.8)
    const json = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    this.stmts.upsert.run({ key, content: json, ts: Date.now() });
  }

  deleteData(key: string): boolean {
    return this.stmts.del.run(key).changes > 0;
  }

  /**
   * 按账号前缀删除数据
   * prefix 格式: "njtech:202321144057" → 删除所有 key 以 ":njtech:202321144057" 结尾的数据
   */
  deleteDataByPrefix(prefix: string): number {
    // 对 prefix 中的 LIKE 通配符做转义,语义等价于旧版 key.endsWith(":" + prefix)
    const pattern = `%:${escapeLike(prefix)}`;
    return this.stmts.delPrefix.run(pattern).changes;
  }

  findActiveCredentials():
    | { schoolId: string; userId: string; username: string; expiresAt: number | null }
    | null {
    const row = this.stmts.credActive.get(Date.now()) as
      | { school_id: string; user_id: string; credential_data: string; expires_at: number | null }
      | undefined;
    if (!row) return null;
    const expiresAt = typeof row.expires_at === "number" ? row.expires_at : null;
    try {
      const data = JSON.parse(row.credential_data) as Record<string, string>;
      return {
        schoolId: row.school_id,
        userId: row.user_id,
        username: data.username || row.user_id,
        expiresAt,
      };
    } catch {
      // eslint-disable-next-line no-console
      console.error("[ServerDB] credential_data JSON parse failed for", row.school_id, row.user_id);
      return { schoolId: row.school_id, userId: row.user_id, username: row.user_id, expiresAt };
    }
  }

  /**
   * 查找最近一条凭证记录（无视过期时间）。
   * 供 session 端点使用：cookie 过期但记住密码仍有效时，应返回已认证状态，
   * 让自动刷新调度器能用记住的密码静默重登。
   */
  findMostRecentCredential():
    | { schoolId: string; userId: string; username: string; expiresAt: number | null }
    | null {
    const row = this.stmts.credRecent.get() as
      | { school_id: string; user_id: string; credential_data: string; expires_at: number | null }
      | undefined;
    if (!row) return null;
    const expiresAt = typeof row.expires_at === "number" ? row.expires_at : null;
    try {
      const data = JSON.parse(row.credential_data) as Record<string, string>;
      return {
        schoolId: row.school_id,
        userId: row.user_id,
        username: data.username || row.user_id,
        expiresAt,
      };
    } catch {
      // eslint-disable-next-line no-console
      console.error("[ServerDB] findMostRecentCredential JSON parse failed");
      return { schoolId: row.school_id, userId: row.user_id, username: row.user_id, expiresAt };
    }
  }

  /**
   * 当有效凭证不存在时，从本地已保存的数据中推断最近使用的账号前缀。
   * 优先查找 schedule/grades/dashboard-summary 等关键 key，避免凭证过期后读到空 default。
   */
  findLocalAccountPrefix(schoolId = "njtech"): string | null {
    const keys = this.listKeys();
    const candidates = new Map<string, number>();

    for (const key of keys) {
      const match = key.match(/^(schedule|grades|dashboard-summary|assignments|running|exams):([^:]+):([^:]+)$/);
      if (!match) continue;
      const [, , kSchool, userId] = match;
      if (kSchool !== schoolId) continue;
      if (userId === "default") continue;
      const prefix = `${kSchool}:${userId}`;
      candidates.set(prefix, (candidates.get(prefix) || 0) + 1);
    }

    if (candidates.size === 0) return null;
    return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  listKeys(): string[] {
    return (this.stmts.listKeys.all() as { key: string }[]).map((r) => r.key);
  }

  getUpdatedAt(key: string): number | null {
    const row = this.stmts.updatedAt.get(key) as { updated_at: number } | undefined;
    return row ? row.updated_at : null;
  }

  // ── Credentials Store ──────────────────────────────────────

  saveCredentials(
    schoolId: string,
    userId: string,
    data: Record<string, string>,
    expiresAt?: number
  ): void {
    this.stmts.credUpsert.run({
      school_id: schoolId,
      user_id: userId,
      credential_data: JSON.stringify(data),
      expires_at: expiresAt ?? null,
      created_at: Date.now(),
    });
  }

  getCredentials(schoolId: string, userId: string): Record<string, string> | null {
    const row = this.stmts.credGet.get(schoolId, userId) as
      | { credential_data: string; expires_at: number | null }
      | undefined;
    if (!row) return null;
    if (row.expires_at && Date.now() > row.expires_at) return null;
    try {
      return JSON.parse(row.credential_data);
    } catch {
      // eslint-disable-next-line no-console
      console.error("[ServerDB] getCredentials JSON parse failed for", schoolId, userId);
      return null;
    }
  }

  deleteCredentials(schoolId: string, userId: string): boolean {
    return this.stmts.credDel.run(schoolId, userId).changes > 0;
  }

  // ── Utility ────────────────────────────────────────────────

  cleanExpiredData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    return this.stmts.cleanOld.run(cutoff).changes;
  }

  getDbSize(): number {
    try {
      return fs.statSync(this.storePath).size;
    } catch {
      return 0;
    }
  }

  close(): void {
    this.db.close();
  }

  // ── Seed from legacy timetable/data ────────────────────────

  seedFromTimetable(prefix: string): { assignments: number; running: number } {
    const result = { assignments: 0, running: 0 };
    const timetableDataDir = path.join(this.storePath, "..", "..", "timetable", "data");

    if (!this.readData(`assignments:${prefix}`)) {
      const assignmentsPath = path.join(timetableDataDir, "assignments.json");
      try {
        if (fs.existsSync(assignmentsPath)) {
          const content = fs.readFileSync(assignmentsPath, "utf8");
          const data = JSON.parse(content);
          this.writeData(`assignments:${prefix}`, data);
          result.assignments = Array.isArray(data) ? data.length : 0;
        }
      } catch { /* ignore */ }
    }

    if (!this.readData(`running:${prefix}`)) {
      const runningPath = path.join(timetableDataDir, "running.json");
      try {
        if (fs.existsSync(runningPath)) {
          const content = fs.readFileSync(runningPath, "utf8");
          const data = JSON.parse(content);
          this.writeData(`running:${prefix}`, data);
          result.running = Array.isArray(data?.records) ? data.records.length : 0;
        }
      } catch { /* ignore */ }
    }

    return result;
  }
}
