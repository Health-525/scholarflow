/**
 * 周报生成器测试。
 */
import { describe, it, expect } from "vitest";

import {
  buildWeeklyReportMarkdown,
  getCurrentWeekRange,
} from "@/lib/reports/weekly";
import type { Assignment } from "@/types";

describe("getCurrentWeekRange", () => {
  it("返回周一到周日的日期范围", () => {
    // 2024-06-19 是周三
    const result = getCurrentWeekRange(new Date("2024-06-19T12:00:00Z"));
    expect(result.start).toBe("2024-06-17");
    expect(result.end).toBe("2024-06-23");
    expect(result.slug).toBe("2024-06-17_2024-06-23");
  });

  it("周日应归属到当前周", () => {
    // 2024-06-23 是周日
    const result = getCurrentWeekRange(new Date("2024-06-23T12:00:00Z"));
    expect(result.start).toBe("2024-06-17");
    expect(result.end).toBe("2024-06-23");
  });

  it("周一应开启新的一周", () => {
    // 2024-06-17 是周一
    const result = getCurrentWeekRange(new Date("2024-06-17T12:00:00Z"));
    expect(result.start).toBe("2024-06-17");
    expect(result.end).toBe("2024-06-23");
  });
});

describe("buildWeeklyReportMarkdown", () => {
  function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
    return {
      id: "1",
      subject: "数学",
      title: "习题集",
      deadline: new Date("2024-06-20").toISOString(),
      done: false,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it("空数据时生成带有提示的周报", () => {
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments: [],
    });
    expect(md).toContain("周报");
    expect(md).toContain("作业完成：0/0（0%）");
    expect(md).toContain("本周还没有日报记录");
  });

  it("汇总作业完成情况", () => {
    const assignments = [
      makeAssignment({ done: true, subject: "数学", title: "微积分练习" }),
      makeAssignment({ done: false, subject: "英语", title: "背单词" }),
    ];
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments,
    });
    expect(md).toContain("作业完成：1/2（50%）");
    expect(md).toContain("- [x] 数学 · 微积分练习");
    expect(md).toContain("- [ ] 英语 · 背单词");
  });

  it("汇总日报高亮内容", () => {
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [
        { date: "2024-06-17", content: "# 日报\n\n完成数学作业\n复习英语" },
        { date: "2024-06-18", content: "\n\n  \n" },
      ],
      assignments: [],
    });
    expect(md).toContain("日报记录：2 天");
    expect(md).toContain("完成数学作业");
    expect(md).toContain("复习英语");
    expect(md).toContain("（日报内容为空）");
  });

  it("包含课表统计", () => {
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments: [],
      schedule: {
        courses: [
          {
            title: "高等数学",
            weekday: 1,
            periods: [1, 2],
            weeks: "1-16",
            location: "A101",
            teacher: "张教授",
          },
        ],
        meta: { week1_monday: "2024-06-17", tz: "Asia/Shanghai" },
      },
    });
    expect(md).toContain("本周课程：1 门");
  });
});
