/**
 * lib/assignment-utils.ts 单元测试
 */
import { describe, it, expect } from "vitest";
import {
  classifyUrgency,
  formatDeadlineCountdown,
  sortAssignments,
  buildAssignment,
} from "@/lib/assignment-utils";
import type { Assignment } from "@/types";

describe("classifyUrgency", () => {
  const now = new Date("2026-06-05T12:00:00Z");

  it("已逾期", () => {
    const deadline = "2026-06-04T00:00:00Z";
    expect(classifyUrgency(deadline, now)).toBe("overdue");
  });

  it("24小时内紧急", () => {
    const deadline = "2026-06-05T23:59:00Z";
    expect(classifyUrgency(deadline, now)).toBe("urgent");
  });

  it("72小时内提醒", () => {
    const deadline = "2026-06-07T12:00:00Z";
    expect(classifyUrgency(deadline, now)).toBe("reminder");
  });

  it("正常", () => {
    const deadline = "2026-06-10T00:00:00Z";
    expect(classifyUrgency(deadline, now)).toBe("normal");
  });
});

describe("formatDeadlineCountdown", () => {
  it("已逾期显示小时", () => {
    const result = formatDeadlineCountdown(-2 * 3600 * 1000); // 2小时前
    expect(result).toContain("已逾期");
    expect(result).toContain("2 小时");
  });

  it("24小时内显示小时+分钟", () => {
    const result = formatDeadlineCountdown(5 * 3600 * 1000 + 30 * 60 * 1000);
    expect(result).toContain("5 小时");
    expect(result).toContain("30 分钟");
  });

  it("超过24小时显示天+小时", () => {
    const result = formatDeadlineCountdown(2 * 24 * 3600 * 1000 + 6 * 3600 * 1000);
    expect(result).toContain("2 天");
    expect(result).toContain("6 小时");
  });
});

describe("sortAssignments", () => {
  const base: Assignment = {
    id: "1",
    subject: "数学",
    title: "作业",
    deadline: "2026-06-10T00:00:00Z",
    done: false,
    createdAt: "2026-06-01T00:00:00Z",
  };

  it("按截止时间升序", () => {
    const late: Assignment = { ...base, id: "2", deadline: "2026-06-15T00:00:00Z" };
    const early: Assignment = { ...base, id: "3", deadline: "2026-06-05T00:00:00Z" };
    const sorted = sortAssignments([late, base, early]);
    expect(sorted[0].id).toBe("3");
    expect(sorted[2].id).toBe("2");
  });

  it("空数组返回空", () => {
    expect(sortAssignments([])).toEqual([]);
  });

  it("不修改原数组", () => {
    const arr = [base];
    const sorted = sortAssignments(arr);
    expect(sorted).not.toBe(arr);
  });
});

describe("buildAssignment", () => {
  it("从 Draft 构建完整 Assignment", () => {
    const draft = {
      subject: "数值分析",
      title: "第三章习题",
      deadline: "2026-05-10T23:59:00Z",
    };
    const result = buildAssignment(draft);
    expect(result.subject).toBe("数值分析");
    expect(result.title).toBe("第三章习题");
    expect(result.done).toBe(false);
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeTruthy();
  });
});
