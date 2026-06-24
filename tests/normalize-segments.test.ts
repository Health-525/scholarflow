/**
 * @vitest-environment node
 *
 * lib/activity/normalize-segments.js 单元测试
 */
import { describe, expect, it } from "vitest";

import { normalizeSegments } from "@/lib/activity/normalize-segments";

function row(overrides: Partial<Parameters<typeof normalizeSegments>[0][number]> = {}) {
  const begin_at = overrides.begin_at ?? 0;
  return {
    id: 1,
    type: "app",
    app: "Chrome",
    title: "GitHub",
    domain: "github.com",
    category: "coding",
    project: null,
    begin_at,
    end_at: overrides.end_at ?? begin_at + 5000,
    ...overrides,
  };
}

describe("normalizeSegments", () => {
  it("空数组返回空数组", () => {
    expect(normalizeSegments([])).toEqual([]);
  });

  it("按 begin_at 排序", () => {
    const rows = [row({ begin_at: 2000 }), row({ begin_at: 1000 }), row({ begin_at: 3000 })];
    const normalized = normalizeSegments(rows);
    expect(normalized.map((r) => r.begin_at)).toEqual([1000, 2000, 3000]);
  });

  it("合并相邻同类片段", () => {
    const rows = [
      row({ begin_at: 0, end_at: 5000 }),
      row({ begin_at: 5001, end_at: 10001 }),
    ];
    const normalized = normalizeSegments(rows);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].begin_at).toBe(0);
    expect(normalized[0].end_at).toBe(10001);
  });

  it("不合并不同应用的片段", () => {
    const rows = [
      row({ begin_at: 0, end_at: 5000, app: "Chrome" }),
      row({ begin_at: 5001, end_at: 10001, app: "VS Code" }),
    ];
    const normalized = normalizeSegments(rows);
    expect(normalized).toHaveLength(2);
  });

  it("过滤短于 3 秒的应用碎片", () => {
    const rows = [row({ begin_at: 0, end_at: 1000, app: "Chrome" })];
    const normalized = normalizeSegments(rows);
    expect(normalized).toHaveLength(0);
  });

  it("保留短于 3 秒的 idle/away 片段", () => {
    const rows = [
      row({ type: "idle", begin_at: 0, end_at: 1000, app: null, category: null }),
    ];
    const normalized = normalizeSegments(rows);
    expect(normalized).toHaveLength(1);
  });

  it("未闭合片段使用当前时间计算时长", () => {
    const now = Date.now();
    const rows = [row({ begin_at: now - 5000, end_at: null, app: "Chrome" })];
    const normalized = normalizeSegments(rows);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].end_at).toBeNull();
  });
});
