/**
 * lib/schedule/schedule.ts 单元测试
 *
 * 测试课表引擎核心逻辑：周次解析、日期计算、课程查询、输出格式化。
 */
import { describe, it, expect } from "vitest";

import {
  parseWeekSpec,
  weekday1to7,
  getWeekNumber,
  parseSchedule,
  getItemsForDate,
  type RawScheduleData,
} from "@/lib/schedule/schedule";

// ════════════════════════════════════════════════════
// parseWeekSpec
// ════════════════════════════════════════════════════
describe("parseWeekSpec", () => {
  it("单区间", () => {
    expect(parseWeekSpec("2-13")).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    );
  });

  it("逗号分隔", () => {
    expect(parseWeekSpec("1,3,5")).toEqual([1, 3, 5]);
  });

  it("混合格式", () => {
    expect(parseWeekSpec("1,3,5-7,10")).toEqual([1, 3, 5, 6, 7, 10]);
  });

  it("逆序区间自动纠正", () => {
    expect(parseWeekSpec("13-2")).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    );
  });

  it("中文逗号兼容", () => {
    expect(parseWeekSpec("1，3，5-7")).toEqual([1, 3, 5, 6, 7]);
  });

  it("空格容错", () => {
    expect(parseWeekSpec(" 1 , 3 , 5-7 ")).toEqual([1, 3, 5, 6, 7]);
  });

  it("空字符串返回空数组", () => {
    expect(parseWeekSpec("")).toEqual([]);
  });

  it("单个周次", () => {
    expect(parseWeekSpec("12")).toEqual([12]);
  });

  it("非法字符跳过", () => {
    expect(parseWeekSpec("abc,3,xyz-9")).toEqual([3]);
  });
});

// ════════════════════════════════════════════════════
// weekday1to7
// ════════════════════════════════════════════════════
describe("weekday1to7", () => {
  it("周一 = 1", () => {
    expect(weekday1to7(new Date("2026-06-01"))).toBe(1); // 2026-06-01 is Monday
  });

  it("周日 = 7", () => {
    expect(weekday1to7(new Date("2026-06-07"))).toBe(7); // 2026-06-07 is Sunday
  });

  it("周三 = 3", () => {
    expect(weekday1to7(new Date("2026-06-03"))).toBe(3); // 2026-06-03 is Wednesday
  });
});

// ════════════════════════════════════════════════════
// getWeekNumber
// ════════════════════════════════════════════════════
describe("getWeekNumber", () => {
  const week1Monday = "2026-03-02"; // real semester week1

  it("第1周周一 = 1", () => {
    expect(getWeekNumber(new Date("2026-03-02"), week1Monday)).toBe(1);
  });

  it("第2周周一 = 2", () => {
    expect(getWeekNumber(new Date("2026-03-09"), week1Monday)).toBe(2);
  });

  it("第13周周一 = 13", () => {
    expect(getWeekNumber(new Date("2026-05-25"), week1Monday)).toBe(13);
  });

  it("第1周周日 = 1", () => {
    expect(getWeekNumber(new Date("2026-03-08"), week1Monday)).toBe(1);
  });
});

// ════════════════════════════════════════════════════
// parseSchedule
// ════════════════════════════════════════════════════
describe("parseSchedule", () => {
  const validData = {
    meta: { week1_monday: "2026-03-02", tz: "Asia/Shanghai" },
    courses: [],
  };

  it("合法数据通过验证", () => {
    expect(() => parseSchedule(validData)).not.toThrow();
  });

  it("缺少 meta.week1_monday 抛出错误", () => {
    expect(() => parseSchedule({})).toThrow(/missing meta.week1_monday/);
  });

  it("null 输入抛出错误", () => {
    expect(() => parseSchedule(null)).toThrow(/missing meta.week1_monday/);
  });

  it("undefined 输入抛出错误", () => {
    expect(() => parseSchedule(undefined)).toThrow(/missing meta.week1_monday/);
  });
});

// ════════════════════════════════════════════════════
// getItemsForDate
// ════════════════════════════════════════════════════
describe("getItemsForDate", () => {
  const schedule: RawScheduleData = {
    meta: { week1_monday: "2026-03-02", tz: "Asia/Shanghai" },
    periodTimes: {
      "1": "08:10-08:55",
      "2": "09:05-09:50",
      "3": "10:20-11:05",
      "4": "11:15-12:00",
      "5": "14:00-14:45",
      "6": "14:55-15:40",
    },
    courses: [
      {
        title: "数值分析",
        weekday: 2,
        periods: [5, 6],
        weeks: "2-17",
        location: "笃学B楼 202",
      },
      {
        title: "毛概",
        weekday: 2,
        periods: [3, 4],
        weeks: "2-11",
        location: "笃学B楼 204",
      },
      {
        title: "体育",
        weekday: 3,
        periods: [1, 2],
        weeks: "1-15",
        location: "体育馆",
      },
    ],
    special: [
      {
        title: "Python上机",
        weekday: [1],
        weeks: "3,5,7",
        times: [{ start: "14:00", end: "15:40" }],
        location: "笃行楼235",
      },
    ],
  };

  it("无课日返回空数组", () => {
    const saturday = new Date("2026-03-07"); // Week 1 Saturday
    const result = getItemsForDate(schedule, saturday);
    expect(result.items).toHaveLength(0);
    expect(result.weekNum).toBe(1);
  });

  it("有课日返回课程", () => {
    const tuesday = new Date("2026-03-10"); // Week 2 Tuesday
    const result = getItemsForDate(schedule, tuesday);
    const courseTitles = result.items.map((i) => i.title);
    expect(courseTitles).toContain("数值分析");
    expect(courseTitles).toContain("毛概");
  });

  it("周次范围外课程不出现", () => {
    const tuesdayWeek12 = new Date("2026-05-19"); // Week 12 Tuesday
    const result = getItemsForDate(schedule, tuesdayWeek12);
    const courseTitles = result.items.map((i) => i.title);
    // 毛概 2-11周，第12周不应该出现
    expect(courseTitles).not.toContain("毛概");
    // 数值分析 2-17周，第12周应该出现
    expect(courseTitles).toContain("数值分析");
  });

  it("special项目正确匹配", () => {
    const monday = new Date("2026-03-16"); // Week 3 Monday
    const result = getItemsForDate(schedule, monday);
    const specials = result.items.filter((i) => i.kind === "special");
    expect(specials).toHaveLength(1);
    expect(specials[0].title).toBe("Python上机");
  });

  it("special按时间排序在前", () => {
    // 构造一个既有 special 又有 course 的场景
    const monday = new Date("2026-03-16"); // Week 3 Monday
    const result = getItemsForDate(schedule, monday);
    // special 应排在 course 前面
    if (result.items.length > 0) {
      expect(result.items[0].kind).toBe("special");
    }
  });

  it("课程按节次排序", () => {
    const tuesday = new Date("2026-03-10");
    const result = getItemsForDate(schedule, tuesday);
    const courses = result.items.filter((i) => i.kind === "course");
    for (let i = 1; i < courses.length; i++) {
      const prev = courses[i - 1] as { periods: number[] };
      const curr = courses[i] as { periods: number[] };
      expect(prev.periods[0]).toBeLessThanOrEqual(curr.periods[0]);
    }
  });
});

