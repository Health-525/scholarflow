/**
 * lib/schedule/holidays.ts / adjustments.ts 单元测试
 *
 * 测试法定节假日识别与调休上班日课程映射。
 */
import { describe, it, expect } from "vitest";

import { getAdjustedItemsForDate } from "@/lib/schedule/adjustments";
import { getHolidayInfo, getSubstituteWeekday } from "@/lib/schedule/holidays";
import type { RawScheduleData } from "@/lib/schedule/schedule";

// ════════════════════════════════════════════════════
// getSubstituteWeekday / getHolidayInfo
// ════════════════════════════════════════════════════
describe("getSubstituteWeekday", () => {
  it("2026 年劳动节调休上班补周二", () => {
    expect(getSubstituteWeekday(new Date("2026-05-09"))).toBe(2);
  });

  it("2026 年国庆节 9/20 调休上班补周二", () => {
    expect(getSubstituteWeekday(new Date("2026-09-20"))).toBe(2);
  });

  it("2026 年国庆节 10/10 调休上班补周三", () => {
    expect(getSubstituteWeekday(new Date("2026-10-10"))).toBe(3);
  });

  it("普通日期返回 undefined", () => {
    expect(getSubstituteWeekday(new Date("2026-06-01"))).toBeUndefined();
  });
});

describe("getHolidayInfo", () => {
  it("法定节假日识别", () => {
    const info = getHolidayInfo(new Date("2026-05-01"));
    expect(info).not.toBeNull();
    expect(info?.type).toBe("holiday");
    expect(info?.name).toContain("劳动节");
  });

  it("调休上班日携带 substituteWeekday", () => {
    const info = getHolidayInfo(new Date("2026-05-09"));
    expect(info?.type).toBe("workday");
    expect(info?.substituteWeekday).toBe(2);
    expect(info?.name).toContain("补周二课");
  });
});

// ════════════════════════════════════════════════════
// getAdjustedItemsForDate 调休映射
// ════════════════════════════════════════════════════
describe("getAdjustedItemsForDate 调休上班", () => {
  const schedule: RawScheduleData = {
    meta: { week1_monday: "2026-04-27", tz: "Asia/Shanghai" },
    periodTimes: {
      "1": "08:10-08:55",
      "2": "09:05-09:50",
    },
    courses: [
      {
        title: "周二课程",
        weekday: 2,
        periods: [1, 2],
        weeks: "1-16",
      },
      {
        title: "周六课程",
        weekday: 6,
        periods: [1, 2],
        weeks: "1-16",
      },
    ],
  };

  it("劳动节 5/9（周六）应显示周二课程", () => {
    const { items } = getAdjustedItemsForDate(schedule, new Date("2026-05-09"), []);
    const titles = items.map((i) => i.title);
    expect(titles).toContain("周二课程");
    expect(titles).not.toContain("周六课程");
  });

  it("调休上班日会显示提示标记", () => {
    const { items } = getAdjustedItemsForDate(schedule, new Date("2026-05-09"), []);
    const holidayItems = items.filter((i) => i.kind === "holiday");
    expect(holidayItems).toHaveLength(1);
    expect(holidayItems[0].title).toContain("调休上班");
  });

  it("普通周六仍显示周六课程", () => {
    const { items } = getAdjustedItemsForDate(schedule, new Date("2026-05-16"), []);
    const titles = items.map((i) => i.title);
    expect(titles).toContain("周六课程");
    expect(titles).not.toContain("周二课程");
  });
});
