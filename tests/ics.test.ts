/**
 * lib/ics.ts 单元测试
 */
import { describe, it, expect } from "vitest";
import { validateICS, buildWeekICS } from "@/lib/ics";
import type { RawScheduleData } from "@/lib/schedule/schedule";

describe("validateICS", () => {
  it("完整 ICS 通过验证", () => {
    const valid = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
    expect(validateICS(valid)).toBe(true);
  });

  it("缺少 VCALENDAR 不通过", () => {
    expect(validateICS("VERSION:2.0")).toBe(false);
  });

  it("缺少 VERSION 不通过", () => {
    expect(validateICS("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toBe(false);
  });

  it("空字符串不通过", () => {
    expect(validateICS("")).toBe(false);
  });
});

describe("buildWeekICS", () => {
  const schedule: RawScheduleData = {
    meta: { week1_monday: "2026-03-02", tz: "Asia/Shanghai" },
    periodTimes: {
      "1": "08:10-08:55",
      "2": "09:05-09:50",
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
    ],
  };

  it("返回有效 ICS 格式", () => {
    // 2026-03-10 = Week 2 Tuesday (数值分析上课日)
    const ics = buildWeekICS(schedule, new Date("2026-03-10"));
    expect(validateICS(ics)).toBe(true);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("包含课程名", () => {
    const ics = buildWeekICS(schedule, new Date("2026-03-10"));
    expect(ics).toContain("数值分析");
  });

  it("包含地点", () => {
    const ics = buildWeekICS(schedule, new Date("2026-03-10"));
    expect(ics).toContain("笃学B楼 202");
  });

  it("空课表也生成有效 ICS", () => {
    const emptySchedule: RawScheduleData = {
      meta: { week1_monday: "2026-03-02" },
      courses: [],
    };
    const ics = buildWeekICS(emptySchedule, new Date("2026-03-10"));
    expect(validateICS(ics)).toBe(true);
    // 无 VEVENT
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("包含 PRODID 和 VERSION", () => {
    const ics = buildWeekICS(schedule, new Date("2026-03-10"));
    expect(ics).toContain("PRODID:-//ScholarFlow");
    expect(ics).toContain("VERSION:2.0");
  });
});
