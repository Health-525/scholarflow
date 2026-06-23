/**
 * 周报生成器测试。
 */
import { describe, it, expect } from "vitest";

import {
  buildWeeklyReportMarkdown,
  generateWeeklyTheme,
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

describe("buildWeeklyReportMarkdown", () => {
  it("空数据时生成带有提示的周报", () => {
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments: [],
      dayCourses: {},
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
      dayCourses: {},
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
      dayCourses: {},
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
      dayCourses: {
        "2024-06-17": [
          {
            title: "高等数学",
            weekday: 1,
            periods: [1, 2],
            location: "A101",
            teacher: "张教授",
            timeText: "08:00-09:40",
          },
        ],
      },
    });
    expect(md).toContain("本周课程：1 门");
  });

  it("生成的周报包含主题小节", () => {
    const md = buildWeeklyReportMarkdown({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments: [],
      dayCourses: {},
    });
    expect(md).toContain("## 本周主题：");
  });
});

describe("generateWeeklyTheme", () => {
  it("空数据返回鼓励型主题", () => {
    const theme = generateWeeklyTheme({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [],
      assignments: [],
      dayCourses: {},
    });
    expect(theme).toContain("空白周");
  });

  it("高完成率且记录多返回高效主题", () => {
    const assignments = Array.from({ length: 10 }, (_, i) =>
      makeAssignment({ id: String(i), title: `作业 ${i}`, done: true })
    );
    const theme = generateWeeklyTheme({
      weekStart: "2024-06-17",
      weekEnd: "2024-06-23",
      dailyReports: [
        { date: "2024-06-17", content: "今天完成了数学作业，系统复习了导数和积分的相关知识点，感觉收获很大。" },
        { date: "2024-06-18", content: "复习了英语单词和语法结构，另外做了一篇阅读理解练习并整理了错题。" },
        { date: "2024-06-19", content: "预习了物理电磁学相关内容，整理了课堂笔记并标注了不理解的部分。" },
        { date: "2024-06-20", content: "完成了化学实验报告，详细记录了实验数据、现象观察和最终结论分析。" },
        { date: "2024-06-21", content: "整理了本周各科笔记，回顾了重点难点，为即将到来的期末考试做准备。" },
      ],
      assignments,
      dayCourses: {},
    });
    expect(theme).toContain("高效周");
  });
});
