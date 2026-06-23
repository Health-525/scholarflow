/**
 * lib/schedule/adjustments.ts 单元测试
 *
 * 测试调课记录的存储隔离、增删校验，以及应用调课后课程列表的正确性。
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  addAdjustment,
  clearAdjustments,
  findCourseBySource,
  loadAdjustments,
  removeAdjustment,
  saveAdjustments,
  getAdjustedItemsForDate,
  type Adjustment,
} from "@/lib/schedule/adjustments";
import type { RawScheduleData } from "@/lib/schedule/schedule";

const LEGACY_KEY = "sf_adjustments_v1";

function scopedKey(schoolId: string, userId: string) {
  return `${LEGACY_KEY}:${schoolId}:${userId}`;
}

const baseSchedule: RawScheduleData = {
  meta: { week1_monday: "2026-03-02", tz: "Asia/Shanghai" },
  periodTimes: {
    "1": "08:10-08:55",
    "2": "09:05-09:50",
    "3": "10:20-11:05",
    "4": "11:15-12:00",
  },
  courses: [
    {
      title: "数值分析",
      weekday: 2,
      periods: [3, 4],
      weeks: "2-17",
      location: "笃学B楼 202",
    },
    {
      title: "体育",
      weekday: 3,
      periods: [1, 2],
      weeks: "1-15",
      location: "体育馆",
    },
  ],
};

describe("adjustments 存储", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("同一账号能存取调课记录", () => {
    const adj: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    saveAdjustments([adj], "njtech", "u1");
    expect(loadAdjustments("njtech", "u1")).toEqual([adj]);
  });

  it("不同账号数据隔离", () => {
    const adj1: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    saveAdjustments([adj1], "njtech", "u1");
    expect(loadAdjustments("njtech", "u2")).toEqual([]);
    expect(loadAdjustments("hebau", "u1")).toEqual([]);
  });

  it("旧 key 数据会自动迁移", () => {
    const adj: Adjustment = {
      id: "legacy",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    localStorage.setItem(LEGACY_KEY, JSON.stringify([adj]));
    const result = loadAdjustments("njtech", "u1");
    expect(result).toEqual([adj]);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(scopedKey("njtech", "u1"))).toEqual(
      JSON.stringify([adj]),
    );
  });

  it("登录后将匿名 default key 数据迁移到当前账号", () => {
    const adj: Adjustment = {
      id: "anon",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    localStorage.setItem(scopedKey("default", "default"), JSON.stringify([adj]));
    const result = loadAdjustments("njtech", "u1");
    expect(result).toEqual([adj]);
    expect(localStorage.getItem(scopedKey("default", "default"))).toBeNull();
    expect(localStorage.getItem(scopedKey("njtech", "u1"))).toEqual(
      JSON.stringify([adj]),
    );
  });

  it("clearAdjustments 清空当前账号数据", () => {
    saveAdjustments(
      [
        {
          id: "a1",
          type: "move",
          sourceWeekday: 2,
          sourcePeriods: [3, 4],
          targetWeekday: 5,
          targetPeriods: [1, 2],
          mode: "longterm",
          startWeek: 1,
          createdAt: Date.now(),
        },
      ],
      "njtech",
      "u1",
    );
    clearAdjustments("njtech", "u1");
    expect(loadAdjustments("njtech", "u1")).toEqual([]);
  });
});

describe("findCourseBySource", () => {
  it("根据星期和节次找到课程", () => {
    const course = findCourseBySource(baseSchedule, 2, [3, 4]);
    expect(course).toBeDefined();
    expect(course?.title).toBe("数值分析");
  });

  it("不存在的源返回 undefined", () => {
    expect(findCourseBySource(baseSchedule, 2, [1, 2])).toBeUndefined();
  });
});

describe("addAdjustment 校验", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("成功添加调课记录", () => {
    const updated = addAdjustment(
      baseSchedule,
      [],
      {
        type: "move",
        sourceWeekday: 2,
        sourcePeriods: [3, 4],
        targetWeekday: 5,
        targetPeriods: [1, 2],
        mode: "longterm",
        startWeek: 1,
      },
      "njtech",
      "u1",
    );
    expect(updated).toHaveLength(1);
    expect(updated[0].targetWeekday).toBe(5);
    expect(loadAdjustments("njtech", "u1")).toHaveLength(1);
  });

  it("成功添加取消单次记录", () => {
    const updated = addAdjustment(
      baseSchedule,
      [],
      {
        type: "cancel",
        sourceWeekday: 2,
        sourcePeriods: [3, 4],
        mode: "once",
        startWeek: 2,
        specificWeek: 2,
      },
      "njtech",
      "u1",
    );
    expect(updated).toHaveLength(1);
    expect(updated[0].type).toBe("cancel");
    expect(updated[0].targetWeekday).toBeUndefined();
  });

  it("源位置没有课程时抛出错误", () => {
    expect(() =>
      addAdjustment(baseSchedule, [], {
        type: "move",
        sourceWeekday: 2,
        sourcePeriods: [1, 2],
        targetWeekday: 5,
        targetPeriods: [3, 4],
      }),
    ).toThrow(/源位置没有对应课程/);
  });

  it("目标节次数与源不一致时抛出错误", () => {
    expect(() =>
      addAdjustment(baseSchedule, [], {
        type: "move",
        sourceWeekday: 2,
        sourcePeriods: [3, 4],
        targetWeekday: 5,
        targetPeriods: [1, 2, 3],
      }),
    ).toThrow(/目标节次数必须与源节次数相同/);
  });

  it("源位置与目标位置相同时抛出错误", () => {
    expect(() =>
      addAdjustment(baseSchedule, [], {
        type: "move",
        sourceWeekday: 2,
        sourcePeriods: [3, 4],
        targetWeekday: 2,
        targetPeriods: [3, 4],
      }),
    ).toThrow(/源位置与目标位置相同/);
  });

  it("单次跨周同节次移动是允许的", () => {
    const updated = addAdjustment(baseSchedule, [], {
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 2,
      targetPeriods: [3, 4],
      mode: "once",
      startWeek: 3,
      specificWeek: 3,
      sourceSpecificWeek: 2,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].sourceSpecificWeek).toBe(2);
    expect(updated[0].specificWeek).toBe(3);
  });

  it("同一源位置不能重复调课", () => {
    const first = addAdjustment(baseSchedule, [], {
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
    });
    expect(() =>
      addAdjustment(baseSchedule, first, {
        type: "move",
        sourceWeekday: 2,
        sourcePeriods: [3, 4],
        targetWeekday: 6,
        targetPeriods: [1, 2],
      }),
    ).toThrow(/已有调课记录/);
  });

});

describe("removeAdjustment", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("删除指定调课记录", () => {
    const adj: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    const updated = removeAdjustment([adj], "a1", "njtech", "u1");
    expect(updated).toHaveLength(0);
    expect(loadAdjustments("njtech", "u1")).toEqual([]);
  });
});

describe("getAdjustedItemsForDate 调课应用", () => {
  it("长期调课：课程显示在目标位置", () => {
    const adjustment: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    // 2026-03-13 是周五，第2周（数值分析从第2周开始）
    const friday = new Date("2026-03-13");
    const { items } = getAdjustedItemsForDate(baseSchedule, friday, [
      adjustment,
    ]);
    const titles = items.map((i) => i.title);
    expect(titles).toContain("数值分析");
    expect(titles).not.toContain("体育");

    const numeric = items.find((i) => i.title === "数值分析");
    expect(numeric?.kind).toBe("course");
    expect((numeric as { periods: number[] }).periods).toEqual([1, 2]);
  });

  it("原位置不再显示被调课程", () => {
    const adjustment: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "longterm",
      startWeek: 1,
      createdAt: Date.now(),
    };
    // 2026-03-10 是周二，第2周
    const tuesday = new Date("2026-03-10");
    const { items } = getAdjustedItemsForDate(baseSchedule, tuesday, [
      adjustment,
    ]);
    expect(items.map((i) => i.title)).not.toContain("数值分析");
  });

  it("单次调课只在指定周次生效", () => {
    const adjustment: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 5,
      targetPeriods: [1, 2],
      mode: "once",
      startWeek: 2,
      specificWeek: 2,
      createdAt: Date.now(),
    };
    // 第1周周五
    const fridayWeek1 = new Date("2026-03-06");
    const resultWeek1 = getAdjustedItemsForDate(baseSchedule, fridayWeek1, [
      adjustment,
    ]);
    expect(resultWeek1.items.map((i) => i.title)).not.toContain("数值分析");

    // 第2周周五
    const fridayWeek2 = new Date("2026-03-13");
    const resultWeek2 = getAdjustedItemsForDate(baseSchedule, fridayWeek2, [
      adjustment,
    ]);
    expect(resultWeek2.items.map((i) => i.title)).toContain("数值分析");
  });

  it("取消记录使该周次源位置不显示课程", () => {
    const adjustment: Adjustment = {
      id: "a1",
      type: "cancel",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      mode: "once",
      startWeek: 2,
      specificWeek: 2,
      createdAt: Date.now(),
    };
    // 第2周周二
    const tuesdayWeek2 = new Date("2026-03-10");
    const result = getAdjustedItemsForDate(baseSchedule, tuesdayWeek2, [
      adjustment,
    ]);
    expect(result.items.map((i) => i.title)).not.toContain("数值分析");

    // 第3周周二仍显示
    const tuesdayWeek3 = new Date("2026-03-17");
    const resultWeek3 = getAdjustedItemsForDate(baseSchedule, tuesdayWeek3, [
      adjustment,
    ]);
    expect(resultWeek3.items.map((i) => i.title)).toContain("数值分析");
  });

  it("单次同节次跨周移动：源周次隐藏，目标周次显示", () => {
    const adjustment: Adjustment = {
      id: "a1",
      type: "move",
      sourceWeekday: 2,
      sourcePeriods: [3, 4],
      targetWeekday: 2,
      targetPeriods: [3, 4],
      mode: "once",
      startWeek: 3,
      specificWeek: 3,
      sourceSpecificWeek: 2,
      createdAt: Date.now(),
    };
    // 第2周周二（源周次）不应显示
    const tuesdayWeek2 = new Date("2026-03-10");
    const resultSource = getAdjustedItemsForDate(baseSchedule, tuesdayWeek2, [
      adjustment,
    ]);
    expect(resultSource.items.map((i) => i.title)).not.toContain("数值分析");

    // 第3周周二（目标周次）应显示
    const tuesdayWeek3 = new Date("2026-03-17");
    const resultTarget = getAdjustedItemsForDate(baseSchedule, tuesdayWeek3, [
      adjustment,
    ]);
    expect(resultTarget.items.map((i) => i.title)).toContain("数值分析");

    // 第4周周二保持原样（因是单次）
    const tuesdayWeek4 = new Date("2026-03-24");
    const resultWeek4 = getAdjustedItemsForDate(baseSchedule, tuesdayWeek4, [
      adjustment,
    ]);
    expect(resultWeek4.items.map((i) => i.title)).toContain("数值分析");
  });
});
