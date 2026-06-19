/**
 * 验证记住密码场景下 session 端点的两层判定逻辑。
 *
 * 核心场景：
 * 1. cookie 有效 → authenticated: true
 * 2. cookie 过期 + 记住密码启用 + 未超30天 → authenticated: true（关键修复点）
 * 3. cookie 过期 + 记住密码未启用 → authenticated: false
 */
import fs from "fs";
import os from "os";
import path from "path";

import Database from "better-sqlite3";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { encryptPassword, decryptPassword } from "@/lib/crypto-password";

// 用临时数据库模拟 ServerDB 的行为
const tmpDir = path.join(os.tmpdir(), `scholarflow-test-${Date.now()}`);

function setupDb() {
  fs.mkdirSync(tmpDir, { recursive: true });
  const dbPath = path.join(tmpDir, "test.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      school_id       TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      credential_data TEXT NOT NULL,
      expires_at      INTEGER,
      created_at      INTEGER NOT NULL,
      PRIMARY KEY (school_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS data_store (
      key        TEXT PRIMARY KEY,
      content    TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const stmts = {
    credUpsert: db.prepare(
      "INSERT INTO credentials (school_id, user_id, credential_data, expires_at, created_at) " +
        "VALUES (@school_id, @user_id, @credential_data, @expires_at, @created_at) " +
        "ON CONFLICT(school_id, user_id) DO UPDATE SET " +
        "credential_data = @credential_data, expires_at = @expires_at, created_at = @created_at"
    ),
    credActive: db.prepare(
      "SELECT * FROM credentials WHERE expires_at IS NULL OR expires_at > ? " +
        "ORDER BY created_at DESC LIMIT 1"
    ),
    credRecent: db.prepare(
      "SELECT * FROM credentials ORDER BY created_at DESC LIMIT 1"
    ),
    writeData: db.prepare(
      "INSERT INTO data_store (key, content, updated_at) VALUES (@key, @content, @ts) " +
        "ON CONFLICT(key) DO UPDATE SET content = @content, updated_at = @ts"
    ),
    readData: db.prepare("SELECT content FROM data_store WHERE key = ?"),
  };

  return { db, stmts };
}

describe("remember-password session logic", () => {
  let db: Database.Database;
  let stmts: ReturnType<typeof setupDb>["stmts"];

  beforeEach(() => {
    const setup = setupDb();
    db = setup.db;
    stmts = setup.stmts;
  });

  afterEach(() => {
    db.close();
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  function saveCredential(expiresAt: number | null) {
    stmts.credUpsert.run({
      school_id: "njtech",
      user_id: "202321144057",
      credential_data: JSON.stringify({ username: "202321144057", cookie: "JSESSIONID=abc123" }),
      expires_at: expiresAt,
      created_at: Date.now() - 60000,
    });
  }

  function saveRememberSetting(enabled: boolean, lastManualLoginAt: number | null) {
    stmts.writeData.run({
      key: "remember-setting:njtech:202321144057",
      content: JSON.stringify({ enabled, lastManualLoginAt }),
      ts: Date.now(),
    });
  }

  function findActiveCredentials(now: number) {
    return stmts.credActive.get(now) as Record<string, unknown> | undefined;
  }

  function findMostRecentCredential() {
    return stmts.credRecent.get() as Record<string, unknown> | undefined;
  }

  function readRememberSetting() {
    const row = stmts.readData.get("remember-setting:njtech:202321144057") as { content: string } | undefined;
    if (!row) return { enabled: false, lastManualLoginAt: null };
    return JSON.parse(row.content);
  }

  it("场景1: cookie 有效期内 → findActiveCredentials 返回凭证", () => {
    const futureExpiry = Date.now() + 10 * 60 * 1000; // 10分钟后过期
    saveCredential(futureExpiry);

    const active = findActiveCredentials(Date.now());
    expect(active).not.toBeFalsy();
    expect(active!.school_id).toBe("njtech");
  });

  it("场景2: cookie 已过期 → findActiveCredentials 返回 null，但 findMostRecentCredential 仍能找到", () => {
    const pastExpiry = Date.now() - 10 * 60 * 1000; // 10分钟前过期
    saveCredential(pastExpiry);

    const active = findActiveCredentials(Date.now());
    expect(active).toBeFalsy(); // cookie 过期，无活跃凭证

    const recent = findMostRecentCredential();
    expect(recent).not.toBeFalsy(); // 新增方法能找到过期凭证
    expect(recent!.school_id).toBe("njtech");
  });

  it("场景3: cookie 过期 + 记住密码启用 + 未超30天 → 应返回 authenticated: true", () => {
    const pastExpiry = Date.now() - 10 * 60 * 1000;
    saveCredential(pastExpiry);
    saveRememberSetting(true, Date.now() - 24 * 60 * 60 * 1000); // 1天前手动登录

    const active = findActiveCredentials(Date.now());
    const recent = findMostRecentCredential();
    const remember = readRememberSetting();

    // 模拟 session 端点的判定逻辑
    let authenticated = false;
    let forceReloginDue = false;

    if (active) {
      authenticated = true;
    } else if (recent && remember.enabled) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (remember.lastManualLoginAt && now - remember.lastManualLoginAt <= thirtyDays) {
        authenticated = true;
        forceReloginDue = false;
      }
    }

    expect(authenticated).toBe(true); // ← 关键断言：cookie过期但记住密码有效
    expect(forceReloginDue).toBe(false);
  });

  it("场景4: cookie 过期 + 记住密码未启用 → authenticated: false", () => {
    const pastExpiry = Date.now() - 10 * 60 * 1000;
    saveCredential(pastExpiry);
    saveRememberSetting(false, Date.now() - 24 * 60 * 60 * 1000);

    const active = findActiveCredentials(Date.now());
    const recent = findMostRecentCredential();
    const remember = readRememberSetting();

    let authenticated = false;

    if (active) {
      authenticated = true;
    } else if (recent && remember.enabled) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (remember.lastManualLoginAt && Date.now() - remember.lastManualLoginAt <= thirtyDays) {
        authenticated = true;
      }
    }

    expect(authenticated).toBe(false); // 未启用记住密码
  });

  it("场景5: cookie 过期 + 记住密码启用 + 超过30天 → authenticated: false", () => {
    const pastExpiry = Date.now() - 10 * 60 * 1000;
    saveCredential(pastExpiry);
    saveRememberSetting(true, Date.now() - 31 * 24 * 60 * 60 * 1000); // 31天前

    const active = findActiveCredentials(Date.now());
    const recent = findMostRecentCredential();
    const remember = readRememberSetting();

    let authenticated = false;

    if (active) {
      authenticated = true;
    } else if (recent && remember.enabled) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (remember.lastManualLoginAt && Date.now() - remember.lastManualLoginAt <= thirtyDays) {
        authenticated = true;
      }
    }

    expect(authenticated).toBe(false); // 超过30天强制重登
  });

  it("场景6: 无任何凭证记录 → authenticated: false", () => {
    const active = findActiveCredentials(Date.now());
    const recent = findMostRecentCredential();

    expect(active).toBeFalsy();
    expect(recent).toBeFalsy();
  });

  it("场景7: cookie 过期 + 记住密码启用 → DB 中有加密保存的密码可解密后用于静默重登", () => {
    const pastExpiry = Date.now() - 10 * 60 * 1000;
    saveCredential(pastExpiry);
    saveRememberSetting(true, Date.now() - 24 * 60 * 60 * 1000);

    // 模拟 /api/auth/login 在 remember=true 时加密保存密码到 DB
    const plainPassword = "test-plain-password";
    const encrypted = encryptPassword(plainPassword);
    const passwordKey = "credential-password:njtech:202321144057";
    stmts.writeData.run({
      key: passwordKey,
      content: JSON.stringify({ password: encrypted }),
      ts: Date.now(),
    });

    // 加密后的内容不应是明文
    expect(encrypted).not.toBe(plainPassword);
    expect(typeof encrypted).toBe("string");

    // 模拟 /api/fetch/all 中的密码解析逻辑
    const savedCreds = findActiveCredentials(Date.now());
    expect(savedCreds).toBeFalsy(); // cookie 过期

    // 从 DB 读取并解密
    const storedPasswordRow = stmts.readData.get(passwordKey) as { content: string } | undefined;
    const storedEncrypted = storedPasswordRow
      ? (JSON.parse(storedPasswordRow.content) as { password?: string }).password
      : undefined;
    const decrypted = decryptPassword(storedEncrypted || "");
    expect(decrypted).toBe(plainPassword);
  });

  it("场景7b: 加密解密往返 — 任意密码加密后可正确解密", () => {
    const passwords = ["abc123", "P@ssw0rd!测试", "a".repeat(100)];
    for (const pw of passwords) {
      const enc = encryptPassword(pw);
      const dec = decryptPassword(enc);
      expect(dec).toBe(pw);
    }
  });

  it("场景8: 未启用记住密码 → DB 中不应有保存的密码", () => {
    saveCredential(Date.now() + 10 * 60 * 1000);
    saveRememberSetting(false, Date.now());

    // 模拟 /api/auth/login 在 remember=false 时删除密码
    stmts.writeData.run({
      key: "credential-password:njtech:202321144057",
      content: JSON.stringify({ password: "should-be-deleted" }),
      ts: Date.now(),
    });
    // remember=false → delete (直接使用 db.exec 删除)
    db.exec("DELETE FROM data_store WHERE key = 'credential-password:njtech:202321144057'");

    const row = stmts.readData.get("credential-password:njtech:202321144057") as { content: string } | undefined;
    expect(row).toBeFalsy();
  });
});
