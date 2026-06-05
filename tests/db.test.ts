/**
 * 离线数据库层测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getDB, ScholarFlowDB } from "@/lib/db";

describe("ScholarFlowDB", () => {
  let db: ScholarFlowDB;

  beforeEach(async () => {
    db = getDB();
    // 清空测试数据
    await db.cachedFiles.clear();
    await db.mutationsQueue.clear();
  });

  it("should cache and retrieve files", async () => {
    await db.cacheFile("execution", "data/test.json", '{"hello":"world"}', "abc123");

    const cached = await db.getCachedFile("execution", "data/test.json");
    expect(cached).toBeDefined();
    expect(cached!.content).toBe('{"hello":"world"}');
    expect(cached!.sha).toBe("abc123");
    expect(cached!.repo).toBe("execution");
  });

  it("should return undefined for uncached files", async () => {
    const result = await db.getCachedFile("execution", "data/nonexistent.json");
    expect(result).toBeUndefined();
  });

  it("should queue and retrieve mutations", async () => {
    await db.queueMutation("execution", "data/test.json", '{"hello":"world"}', "测试变更");

    const pending = await db.getPendingMutations();
    expect(pending.length).toBe(1);
    expect(pending[0].synced).toBe(0);
    expect(pending[0].action).toBe("测试变更");
  });

  it("should mark mutations as synced", async () => {
    const id = await db.queueMutation("execution", "data/test.json", "content", "test");
    await db.markMutationSynced(id);

    const pending = await db.getPendingMutations();
    expect(pending.length).toBe(0);
  });

  it("should clean expired cache", async () => {
    await db.cacheFile("execution", "data/old.json", "old content", "sha");
    // 使用 0ms maxAge，所有缓存都应被视为过期
    const count = await db.cleanExpiredCache(0);
    expect(count).toBe(1);

    const cached = await db.getCachedFile("execution", "data/old.json");
    expect(cached).toBeUndefined();
  });
});
