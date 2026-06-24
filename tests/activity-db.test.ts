/**
 * @vitest-environment node
 *
 * lib/activity/db.ts 单元测试
 *
 * 通过内存 SQLite 实例绕过 getServerDB() 单例，验证 segment CRUD、日汇总、
 * 跨天/未闭合边界处理、数据清理及旧日志解析。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

import * as serverDb from "@/lib/server-db";

const mockDb = new Database(":memory:");
mockDb.exec(`
  CREATE TABLE activity_segments (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('app','idle','away')),
    app TEXT,
    title TEXT,
    domain TEXT,
    category TEXT,
    project TEXT,
    begin_at INTEGER NOT NULL,
    end_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE INDEX idx_activity_begin_end ON activity_segments(begin_at, end_at);
  CREATE INDEX idx_activity_category ON activity_segments(category);
`);

vi.spyOn(serverDb, "getServerDB").mockReturnValue({ getRawDB: () => mockDb } as any);

const {
  insertSegment,
  closeOpenSegment,
  queryDaySummary,
  cleanupOldSegments,
  parseLegacyActivityLog,
} = await import("@/lib/activity/db");

function localEpoch(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clearTable() {
  mockDb.exec("DELETE FROM activity_segments");
}

describe("activity-db", () => {
  beforeEach(() => {
    clearTable();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("insertSegment", () => {
    it("插入 segment 后能查询到", () => {
      const id = insertSegment({
        type: "app",
        app: "VS Code",
        category: "coding",
        beginAt: localEpoch(2026, 6, 22, 10, 0),
        endAt: localEpoch(2026, 6, 22, 10, 30),
      });

      expect(id).toBeGreaterThan(0);

      const row = mockDb.prepare("SELECT * FROM activity_segments WHERE id = ?").get(id) as Record<
        string,
        unknown
      >;
      expect(row.type).toBe("app");
      expect(row.app).toBe("VS Code");
      expect(row.category).toBe("coding");
      expect(row.begin_at).toBe(localEpoch(2026, 6, 22, 10, 0));
      expect(row.end_at).toBe(localEpoch(2026, 6, 22, 10, 30));
    });
  });

  describe("closeOpenSegment", () => {
    it("能闭合未闭合 segment", () => {
      const endAt = localEpoch(2026, 6, 22, 11, 0);
      insertSegment({
        type: "app",
        app: "Chrome",
        beginAt: localEpoch(2026, 6, 22, 10, 0),
      });

      closeOpenSegment(endAt);

      const row = mockDb.prepare("SELECT end_at FROM activity_segments LIMIT 1").get() as {
        end_at: number;
      };
      expect(row.end_at).toBe(endAt);
    });
  });

  describe("queryDaySummary", () => {
    it("正确汇总当天的 app/idle/away 分钟数", () => {
      const day = dateStr(2026, 6, 22);
      const base = localEpoch(2026, 6, 22, 10, 0);

      insertSegment({ type: "app", app: "VS Code", category: "coding", beginAt: base, endAt: base + 10 * 60000 });
      insertSegment({ type: "idle", beginAt: base + 10 * 60000, endAt: base + 15 * 60000 });
      insertSegment({ type: "away", beginAt: base + 15 * 60000, endAt: base + 18 * 60000 });

      const summary = queryDaySummary(day, base + 30 * 60000);

      expect(summary.totalMinutes).toBe(10);
      expect(summary.idleMinutes).toBe(5);
      expect(summary.awayMinutes).toBe(3);
      expect(summary.categoryBreakdown).toEqual([{ category: "coding", minutes: 10 }]);
      expect(summary.appBreakdown).toEqual([{ app: "VS Code", minutes: 10, category: "coding" }]);
      expect(summary.segments).toHaveLength(3);
    });

    it("正确处理跨天 segment，仅计入当天部分", () => {
      const beginAt = localEpoch(2026, 6, 22, 23, 50);
      const endAt = localEpoch(2026, 6, 23, 0, 10);
      insertSegment({ type: "app", app: "Chrome", category: "browsing", beginAt, endAt });

      const firstDay = queryDaySummary(dateStr(2026, 6, 22), endAt + 60 * 60000);
      const secondDay = queryDaySummary(dateStr(2026, 6, 23), endAt + 60 * 60000);

      expect(firstDay.totalMinutes).toBe(10);
      expect(firstDay.appBreakdown).toEqual([{ app: "Chrome", minutes: 10, category: "browsing" }]);
      expect(secondDay.totalMinutes).toBe(10);
      expect(secondDay.appBreakdown).toEqual([{ app: "Chrome", minutes: 10, category: "browsing" }]);
    });

    it("正确处理未闭合 segment，使用传入的 nowMs", () => {
      const day = dateStr(2026, 6, 22);
      const beginAt = localEpoch(2026, 6, 22, 10, 0);
      insertSegment({ type: "app", app: "Terminal", category: "coding", beginAt });

      const summary = queryDaySummary(day, beginAt + 25 * 60000);

      expect(summary.totalMinutes).toBe(25);
      expect(summary.appBreakdown).toEqual([{ app: "Terminal", minutes: 25, category: "coding" }]);
    });
  });

  describe("cleanupOldSegments", () => {
    it("删除过期数据并返回删除条数", () => {
      const now = Date.now();
      insertSegment({ type: "app", app: "Old", beginAt: now - 8 * 24 * 60 * 60 * 1000, endAt: now - 8 * 24 * 60 * 60 * 1000 + 60000 });
      insertSegment({ type: "app", app: "Recent", beginAt: now - 1 * 24 * 60 * 60 * 1000, endAt: now - 1 * 24 * 60 * 60 * 1000 + 60000 });

      const deleted = cleanupOldSegments(7);

      expect(deleted).toBe(1);
      const remaining = mockDb.prepare("SELECT app FROM activity_segments").all() as Array<{ app: string }>;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].app).toBe("Recent");
    });
  });

  describe("parseLegacyActivityLog", () => {
    it("正确解析旧 JSON 格式", () => {
      const legacy = {
        "2026-06-22": {
          date: "2026-06-22",
          segments: [
            { app: "VS Code", title: "project", category: "coding", start: 1000, end: 2000 },
            { app: "Chrome", title: "github.com", domain: "github.com", start: 2000 },
          ],
        },
      };

      const segments = parseLegacyActivityLog(JSON.stringify(legacy));

      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        type: "app",
        app: "VS Code",
        title: "project",
        category: "coding",
        beginAt: 1000,
        endAt: 2000,
      });
      expect(segments[1]).toMatchObject({
        type: "app",
        app: "Chrome",
        domain: "github.com",
        beginAt: 2000,
        endAt: null,
      });
    });

    it("无效 JSON 返回空数组", () => {
      expect(parseLegacyActivityLog("not json")).toEqual([]);
      expect(parseLegacyActivityLog("")).toEqual([]);
    });
  });
});
