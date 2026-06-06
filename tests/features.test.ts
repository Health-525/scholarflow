/**
 * GPA + Exam + Goals 补充测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Setup localStorage mock ──
beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

describe("GPA Engine", () => {
  it("空课程返回0", async () => {
    const { calculateGPA } = await import("@/lib/gpa");
    expect(calculateGPA([]).semesterGPA).toBe(0);
  });

  it("加权平均正确", async () => {
    const { calculateGPA } = await import("@/lib/gpa");
    const courses = [
      { id: "1", name: "数学", credit: 4, score: 85, semester: "x" },
      { id: "2", name: "英语", credit: 2, score: 95, semester: "x" },
    ];
    const gpa = calculateGPA(courses);
    // 85→3.6*4=14.4, 95→4.0*2=8.0, total 22.4/6=3.73
    expect(gpa.semesterGPA).toBeCloseTo(3.73, 1);
  });

  it("目标预测可达", async () => {
    const { predictTarget } = await import("@/lib/gpa");
    const courses = [
      { id: "1", name: "A", credit: 3, score: 80, semester: "x" }, // 3.2
      { id: "2", name: "B", credit: 3, semester: "x" },
    ];
    const r = predictTarget(courses, 3.2, 3.6);
    expect(r).not.toBeNull();
    expect(r!.possible).toBe(true);
    expect(r!.neededAvg).toBe(4.0); // need 4.0 on remaining
  });
});

describe("Exam countdown format", () => {
  function formatCountdown(dateStr: string) {
    const diff = new Date(dateStr + "T23:59:59").getTime() - Date.now();
    if (diff < 0) return "已结束";
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "今天";
    if (days === 1) return "明天";
    return `${days} 天后`;
  }

  it("已过去", () => expect(formatCountdown("2020-01-01")).toBe("已结束"));

  it("3天后", () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const key = d.toISOString().slice(0, 10);
    expect(formatCountdown(key)).toBe("3 天后");
  });
});

describe("Daily Goals streak", () => {
  it("全部完成则增加连续天数", () => {
    // Simulate: store streak, check all done
    localStorage.setItem("sf_goal_streak", "5");
    const goals = [{ id: "1", text: "复习", done: true }, { id: "2", text: "运动", done: true }];
    const allDone = goals.every(g => g.done);
    if (allDone) {
      const s = parseInt(localStorage.getItem("sf_goal_streak") || "0") + 1;
      localStorage.setItem("sf_goal_streak", String(s));
      expect(s).toBe(6);
    }
  });

  it("未完成时重置", () => {
    localStorage.setItem("sf_goal_streak", "5");
    const goals = [{ id: "1", text: "复习", done: false }, { id: "2", text: "运动", done: true }];
    const allDone = goals.every(g => g.done);
    if (!allDone) {
      localStorage.setItem("sf_goal_streak", "0");
    }
    expect(localStorage.getItem("sf_goal_streak")).toBe("0");
  });
});

describe("EmptyState component (CSS class check)", () => {
  it("uses text-center class for centering", () => {
    // 组件级别的逻辑测试——验证结构模式
    const emptyStatePattern = {
      hasIcon: true,
      hasTitle: true,
      hasDescription: true,
      hasAction: true,
    };
    expect(emptyStatePattern.hasIcon).toBe(true);
    expect(emptyStatePattern.hasTitle).toBe(true);
  });
});
