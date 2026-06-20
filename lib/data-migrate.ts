/**
 * 旧数据一次性迁移模块（JSON → SQLite）。
 *
 * 历史版本将数据写入一个或多个 `scholarflow.json`(可能散落在打包目录内),
 * 切换到 better-sqlite3 后新库为空。本模块在 `ServerDB` 构造时被调用一次,
 * 从已知候选位置中选取最新的 Legacy_JSON_Data 导入到空的 SQLite 库。
 *
 * 设计要点:
 *  - 候选发现 / 选取 / 解析拆为可单测的纯函数。
 *  - `ensureMigrated` 幂等(库非空则跳过)且失败安全(不抛出、保留源文件)。
 */

import fs from "fs";
import path from "path";

import type { Database } from "better-sqlite3";

const LEGACY_FILE_NAME = "scholarflow.json";

// ── 接口 ────────────────────────────────────────────────────

/** 旧版纯 JSON 存储的结构(与替换前的 `DataStore` 形态一致)。 */
export interface LegacyDataStore {
  version?: number;
  data_store?: Record<string, { content: string; updated_at: number }>;
  credentials?: Array<{
    school_id: string;
    user_id: string;
    credential_data: string;
    expires_at: number | null;
    created_at: number;
  }>;
}

/** 一个被发现的 Legacy_JSON_Data 候选。 */
export interface MigrationCandidate {
  /** legacy `scholarflow.json` 的绝对路径。 */
  path: string;
  /** `mtimeMs` 与可解析的 `max(data_store[*].updated_at)` 二者较大值。 */
  updatedAt: number;
}

/** 迁移执行结果。 */
export interface MigrationResult {
  migrated: boolean;
  source: string | null;
  target: string;
  error?: string;
}

// ── 候选基目录推导 ──────────────────────────────────────────

/**
 * 由目标 db 路径推导已知的 legacy 候选基目录(不保证存在,后续 discover 再过滤)。
 *
 * 覆盖:
 *  - `<dbDir>`(同目录历史 JSON,最常见)
 *  - `<appRoot>/.next/standalone/data`
 *  - `<appRoot>/.next/standalone/scholarflow/data`
 *  - `<cwd>/data`
 *  - repo 根 `data`(开发态项目根)
 */
export function getLegacyBaseDirs(dbPath: string): string[] {
  const dirs: string[] = [];
  const seen = new Set<string>();
  const push = (dir: string) => {
    const normalized = path.resolve(dir);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      dirs.push(normalized);
    }
  };

  const dbDir = path.dirname(dbPath);
  push(dbDir);

  // 由 dbDir 向上推导出应用根:典型布局 <appRoot>/data 或 .../standalone/data。
  // 取 dbDir 的父目录作为可能的 appRoot 起点,并枚举常见 standalone 子布局。
  const appRoot = path.dirname(dbDir);
  push(path.join(appRoot, ".next", "standalone", "data"));
  push(path.join(appRoot, ".next", "standalone", "scholarflow", "data"));

  const cwd = process.cwd();
  push(path.join(cwd, "data"));
  push(path.join(cwd, ".next", "standalone", "data"));
  push(path.join(cwd, ".next", "standalone", "scholarflow", "data"));

  return dirs;
}

// ── 候选发现 ────────────────────────────────────────────────

/**
 * 在候选基目录中发现存在的 `scholarflow.json`,并计算其 `updatedAt`。
 * 仅返回真实存在的文件;不存在/不可读的目录被静默跳过。
 */
export function discoverLegacyCandidates(baseDirs: string[]): MigrationCandidate[] {
  const candidates: MigrationCandidate[] = [];
  const seenPaths = new Set<string>();

  for (const baseDir of baseDirs) {
    const filePath = path.join(baseDir, LEGACY_FILE_NAME);
    const resolved = path.resolve(filePath);
    if (seenPaths.has(resolved)) continue;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolved);
    } catch {
      continue; // 不存在或不可访问
    }
    if (!stat.isFile()) continue;

    seenPaths.add(resolved);

    let contentMaxUpdatedAt = 0;
    try {
      const raw = fs.readFileSync(resolved, "utf8");
      const store = parseLegacyStore(raw);
      contentMaxUpdatedAt = maxDataStoreUpdatedAt(store);
    } catch {
      // 内容不可解析时,仅以 mtimeMs 作为新鲜度信号。
      contentMaxUpdatedAt = 0;
    }

    candidates.push({
      path: resolved,
      updatedAt: Math.max(stat.mtimeMs, contentMaxUpdatedAt),
    });
  }

  return candidates;
}

function maxDataStoreUpdatedAt(store: LegacyDataStore): number {
  const dataStore = store.data_store;
  if (!dataStore) return 0;
  let max = 0;
  for (const key of Object.keys(dataStore)) {
    const row = dataStore[key];
    const ts = row && typeof row.updated_at === "number" ? row.updated_at : 0;
    if (ts > max) max = ts;
  }
  return max;
}

// ── 纯函数:来源选取与解析 ──────────────────────────────────

/** 选取 `updatedAt` 最大者;空列表返回 `null`。纯函数,可测(R5.2)。 */
export function selectMigrationSource(
  candidates: MigrationCandidate[]
): MigrationCandidate | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].updatedAt > best.updatedAt) {
      best = candidates[i];
    }
  }
  return best;
}

/** 解析 legacy JSON → `LegacyDataStore`;损坏则抛错。纯函数,可测。 */
export function parseLegacyStore(raw: string): LegacyDataStore {
  return JSON.parse(raw) as LegacyDataStore;
}

// ── 迁移导入 ────────────────────────────────────────────────

/**
 * 将 legacy store 导入到打开的 db。仅当 db 为空时执行(幂等,R5.4)。
 * 失败安全:不抛出异常,记录错误并返回 `migrated=false`,保留源文件不删除(R5.6)。
 *
 * @param db          已打开的 better-sqlite3 连接(表已建好)
 * @param targetPath  目标 SQLite_Db_File 绝对路径(用于日志与结果)
 * @param candidates  候选 Legacy_JSON_Data 列表
 */
export function ensureMigrated(
  db: Database,
  targetPath: string,
  candidates: MigrationCandidate[]
): MigrationResult {
  const result: MigrationResult = { migrated: false, source: null, target: targetPath };

  try {
    // 幂等:db 已有任意数据(data_store 或 credentials 有行)则跳过,绝不覆盖(R5.4)。
    if (hasAnyData(db)) {
      return result;
    }

    // 无源则跳过,空库正常启动(R5.1)。
    const source = selectMigrationSource(candidates);
    if (!source) {
      return result;
    }

    const raw = fs.readFileSync(source.path, "utf8");
    const store = parseLegacyStore(raw); // 损坏则抛错 → catch

    const dataStore = store.data_store ?? {};
    const credentials = store.credentials ?? [];

    const upsertData = db.prepare(
      "INSERT INTO data_store (key, content, updated_at) VALUES (@key, @content, @updated_at) " +
        "ON CONFLICT(key) DO UPDATE SET content = @content, updated_at = @updated_at"
    );
    const upsertCred = db.prepare(
      "INSERT INTO credentials (school_id, user_id, credential_data, expires_at, created_at) " +
        "VALUES (@school_id, @user_id, @credential_data, @expires_at, @created_at) " +
        "ON CONFLICT(school_id, user_id) DO UPDATE SET " +
        "credential_data = @credential_data, expires_at = @expires_at, created_at = @created_at"
    );

    // 单事务导入,保证全有或全无(R5.3)。
    const importAll = db.transaction(() => {
      for (const key of Object.keys(dataStore)) {
        const row = dataStore[key];
        upsertData.run({
          key,
          content: row.content,
          updated_at: row.updated_at,
        });
      }
      for (const cred of credentials) {
        upsertCred.run({
          school_id: cred.school_id,
          user_id: cred.user_id,
          credential_data: cred.credential_data,
          expires_at: cred.expires_at ?? null,
          created_at: cred.created_at,
        });
      }
    });
    importAll();

    // eslint-disable-next-line no-console
    console.log("[data-migrate] migrated from", source.path, "to", targetPath); // (R5.5)
    result.migrated = true;
    result.source = source.path;
    return result;
  } catch (err) {
    // 失败安全:不抛出,记录错误,保留源文件,db 保持空,ServerDB 以空库继续(R5.6)。
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[data-migrate] migration failed:", message);
    result.error = message;
    return result;
  }
}

/** 判断 db 是否已含任意 data_store 或 credentials 行。 */
function hasAnyData(db: Database): boolean {
  const dataRow = db
    .prepare("SELECT 1 FROM data_store LIMIT 1")
    .get() as unknown;
  if (dataRow !== undefined) return true;
  const credRow = db
    .prepare("SELECT 1 FROM credentials LIMIT 1")
    .get() as unknown;
  return credRow !== undefined;
}
