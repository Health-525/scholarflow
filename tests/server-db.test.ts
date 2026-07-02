/**
 * @vitest-environment node
 *
 * lib/server-db.ts 单元测试
 *
 * 验证 listKeysLike 的 LIKE 匹配与转义行为，避免 SQL 语法错误和注入风险。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ServerDB } from "@/lib/server-db";

let db: ServerDB;

beforeEach(() => {
  db = new ServerDB(":memory:");
});

afterEach(() => {
  try {
    db.close();
  } catch {
    // ignore
  }
});

describe("ServerDB.listKeysLike", () => {
  it("按前缀模式返回 key", () => {
    db.writeData("note:njtech:user1:a.md", "a");
    db.writeData("note:njtech:user1:b.md", "b");
    db.writeData("note:njtech:user2:c.md", "c");
    db.writeData("schedule:njtech:user1", {});

    const keys = db.listKeysLike("note:njtech:user1:%");
    expect(keys.sort()).toEqual(["note:njtech:user1:a.md", "note:njtech:user1:b.md"]);
  });

  it("按后缀模式返回 key", () => {
    db.writeData("dailyReport:njtech:user1", "a");
    db.writeData("weeklyReport:njtech:user1", "b");
    db.writeData("dailyReport:njtech:user2", "c");

    const keys = db.listKeysLike("%:njtech:user1");
    expect(keys.sort()).toEqual(["dailyReport:njtech:user1", "weeklyReport:njtech:user1"]);
  });

  it("包含 LIKE 通配符的 key 也能正确匹配", () => {
    // key 中包含下划线，应被 ESCAPE '\\' 转义后作为普通字符匹配
    db.writeData("note:njtech:user1:foo_bar.md", "a");
    db.writeData("note:njtech:user1:fooXbar.md", "b");

    const keys = db.listKeysLike("note:njtech:user1:foo\\_bar.md");
    expect(keys).toEqual(["note:njtech:user1:foo_bar.md"]);
  });
});
