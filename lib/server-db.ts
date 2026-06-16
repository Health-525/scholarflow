/**
 * ScholarFlow Server Database — 纯 JSON 文件存储
 *
 * 替代 better-sqlite3，彻底避免 C++ 原生模块和编译依赖。
 * 保留 key-value + credentials 的 API，兼容现有路由和前端。
 */

import fs from "fs";
import path from "path";

// ── Schema ──────────────────────────────────────────────────

const CURRENT_VERSION = 1;

interface DataStore {
  version: number;
  data_store: Record<string, { content: string; updated_at: number }>;
  credentials: Array<{
    school_id: string;
    user_id: string;
    credential_data: string;
    expires_at: number | null;
    created_at: number;
  }>;
}

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
  private storePath: string;
  private store: DataStore;

  constructor(dbPath?: string) {
    this.storePath = dbPath || this.resolveDbPath();
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    this.store = this.loadStore();
    this.migrate();
  }

  private resolveDbPath(): string {
    return path.join(process.cwd(), "data", "scholarflow.json");
  }

  private loadStore(): DataStore {
    if (fs.existsSync(this.storePath)) {
      try {
        const raw = fs.readFileSync(this.storePath, "utf8");
        const parsed = JSON.parse(raw) as Partial<DataStore>;
        return {
          version: parsed.version ?? CURRENT_VERSION,
          data_store: parsed.data_store ?? {},
          credentials: parsed.credentials ?? [],
        };
      } catch {
        // 如果文件损坏，备份后重建
        this.backupCorruptedStore();
      }
    }
    return {
      version: CURRENT_VERSION,
      data_store: {},
      credentials: [],
    };
  }

  private backupCorruptedStore(): void {
    try {
      const backup = `${this.storePath}.corrupted.${Date.now()}`;
      fs.renameSync(this.storePath, backup);
    } catch {
      // ignore
    }
  }

  private migrate(): void {
    if (this.store.version < CURRENT_VERSION) {
      this.store.version = CURRENT_VERSION;
      this.saveStore();
    }
  }

  private saveStore(): void {
    const tmp = `${this.storePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.store, null, 2), "utf8");
    fs.renameSync(tmp, this.storePath);
  }

  // ── Data Store ─────────────────────────────────────────────

  readData(key: string): unknown | null {
    const row = this.store.data_store[key];
    if (!row) return null;
    try {
      return JSON.parse(row.content);
    } catch {
      return row.content;
    }
  }

  writeData(key: string, content: unknown): void {
    const json = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    this.store.data_store[key] = { content: json, updated_at: Date.now() };
    this.saveStore();
  }

  deleteData(key: string): boolean {
    if (key in this.store.data_store) {
      delete this.store.data_store[key];
      this.saveStore();
      return true;
    }
    return false;
  }

  /**
   * 按账号前缀删除数据
   * prefix 格式: "njtech:202321144057" → 删除所有 key 以 ":njtech:202321144057" 结尾的数据
   */
  deleteDataByPrefix(prefix: string): number {
    const suffix = `:${prefix}`;
    const keys = Object.keys(this.store.data_store).filter((k) => k.endsWith(suffix));
    for (const key of keys) {
      delete this.store.data_store[key];
    }
    if (keys.length > 0) this.saveStore();
    return keys.length;
  }

  findActiveCredentials(): { schoolId: string; userId: string; username: string } | null {
    const now = Date.now();
    const valid = this.store.credentials
      .filter((c) => c.expires_at === null || c.expires_at > now)
      .sort((a, b) => b.created_at - a.created_at);

    const row = valid[0];
    if (!row) return null;
    try {
      const data = JSON.parse(row.credential_data) as Record<string, string>;
      return { schoolId: row.school_id, userId: row.user_id, username: data.username || row.user_id };
    } catch {
      return { schoolId: row.school_id, userId: row.user_id, username: row.user_id };
    }
  }

  listKeys(): string[] {
    return Object.keys(this.store.data_store).sort();
  }

  getUpdatedAt(key: string): number | null {
    return this.store.data_store[key]?.updated_at ?? null;
  }

  // ── Credentials Store ──────────────────────────────────────

  saveCredentials(
    schoolId: string,
    userId: string,
    data: Record<string, string>,
    expiresAt?: number
  ): void {
    const idx = this.store.credentials.findIndex(
      (c) => c.school_id === schoolId && c.user_id === userId
    );
    const entry = {
      school_id: schoolId,
      user_id: userId,
      credential_data: JSON.stringify(data),
      expires_at: expiresAt ?? null,
      created_at: Date.now(),
    };
    if (idx >= 0) {
      this.store.credentials[idx] = entry;
    } else {
      this.store.credentials.push(entry);
    }
    this.saveStore();
  }

  getCredentials(schoolId: string, userId: string): Record<string, string> | null {
    const row = this.store.credentials.find(
      (c) => c.school_id === schoolId && c.user_id === userId
    );
    if (!row) return null;
    if (row.expires_at && Date.now() > row.expires_at) return null;
    try {
      return JSON.parse(row.credential_data);
    } catch {
      return null;
    }
  }

  deleteCredentials(schoolId: string, userId: string): boolean {
    const before = this.store.credentials.length;
    this.store.credentials = this.store.credentials.filter(
      (c) => !(c.school_id === schoolId && c.user_id === userId)
    );
    if (this.store.credentials.length < before) {
      this.saveStore();
      return true;
    }
    return false;
  }

  // ── Utility ────────────────────────────────────────────────

  cleanExpiredData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const keys = Object.keys(this.store.data_store).filter(
      (k) => this.store.data_store[k].updated_at < cutoff
    );
    for (const key of keys) {
      delete this.store.data_store[key];
    }
    if (keys.length > 0) this.saveStore();
    return keys.length;
  }

  getDbSize(): number {
    try {
      return fs.statSync(this.storePath).size;
    } catch {
      return 0;
    }
  }

  close(): void {
    this.saveStore();
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
