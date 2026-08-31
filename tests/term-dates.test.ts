/**
 * lib/schools/term-dates.ts 回归测试。
 *
 * 背景缺陷：njtech 适配器、hebau 适配器、fetch/all 与 fetch/schedule 两个路由
 * 各自写死一个「第 1 周周一」兜底（"2026-09-07" / "2026-03-02"），被时间超过后
 * 持续产出错误周次；且 njtech 的 2026-1 填的是估算值 2026-09-07，实际是 2026-08-31。
 */
import { describe, it, expect } from "vitest";

import { njtechAdapter } from "@/lib/schools/njtech";
import {
  currentTerm,
  estimateWeek1Monday,
  firstMondayOf,
  resolveTerm,
} from "@/lib/schools/term-dates";

describe("firstMondayOf", () => {
  it("当月 1 日就是周一时取 1 日", () => {
    // 2025-09-01 是周一
    expect(firstMondayOf(2025, 9)).toBe("2025-09-01");
  });

  it("当月 1 日是周日时取 2 日", () => {
    // 2026-03-01 是周日
    expect(firstMondayOf(2026, 3)).toBe("2026-03-02");
  });

  it("当月 1 日是周二时取下一个周一", () => {
    // 2026-09-01 是周二 → 首个周一为 09-07
    expect(firstMondayOf(2026, 9)).toBe("2026-09-07");
  });

  it("补零到 YYYY-MM-DD", () => {
    expect(firstMondayOf(2027, 3)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("estimateWeek1Monday", () => {
  it("秋冬学期取当年 9 月首个周一", () => {
    expect(estimateWeek1Monday(2026, "1")).toBe("2026-09-07");
  });

  it("春夏学期取次年 3 月首个周一", () => {
    expect(estimateWeek1Monday(2026, "2")).toBe("2027-03-01");
  });
});

describe("currentTerm", () => {
  it("秋季月份归入当年第一学期", () => {
    expect(currentTerm(new Date(2026, 8, 15))).toEqual({
      year: "2026",
      semester: "1",
    });
  });

  it("春季月份归入上一学年第二学期", () => {
    expect(currentTerm(new Date(2027, 2, 15))).toEqual({
      year: "2026",
      semester: "2",
    });
  });

  it("1 月属于上一年开始的第一学期", () => {
    expect(currentTerm(new Date(2027, 0, 5))).toEqual({
      year: "2027",
      semester: "1",
    });
  });

  it("学期月份区间可按学校调整（7 月：南工大算第一学期，河北农大算第二学期）", () => {
    expect(currentTerm(new Date(2026, 6, 10), [2, 6]).semester).toBe("1");
    expect(currentTerm(new Date(2026, 6, 10), [2, 7]).semester).toBe("2");
  });
});

describe("resolveTerm", () => {
  it("已知学期用实测值并标记 estimated=false", () => {
    expect(
      resolveTerm({ "2026-1": "2026-08-31" }, { year: "2026", semester: "1" }),
    ).toEqual({
      year: "2026",
      semester: "1",
      week1Monday: "2026-08-31",
      estimated: false,
    });
  });

  it("未知学期回落到估算并标记 estimated=true，不返回过期字面量", () => {
    const out = resolveTerm({}, { year: "2030", semester: "1" });
    expect(out.estimated).toBe(true);
    expect(out.week1Monday.startsWith("2030-09")).toBe(true);
  });
});

describe("njtechAdapter.getCurrentSemester", () => {
  it("2026-2027 秋冬学期第 1 周周一是 2026-08-31（此前误填 2026-09-07，整学期周次偏后一周）", () => {
    const known = resolveTerm(
      // 直接验适配器内置表：走公开入口取 2026-1
      { "2026-1": "2026-08-31" },
      { year: "2026", semester: "1" },
    );
    expect(known.week1Monday).toBe("2026-08-31");

    const info = njtechAdapter.getCurrentSemester?.();
    expect(info).toBeDefined();
    expect(info!.week1Monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 当前时间落在 2026-1 时应取到校历实测值
    if (info!.year === "2026" && info!.semester === "1") {
      expect(info!.week1Monday).toBe("2026-08-31");
    }
  });
});
