/**
 * NJTECH 绩点换算与成绩汇总的回归测试。
 *
 * 每个用例对应一个真实缺陷：
 * - 「不及格」曾被 t.includes("及格") 命中，返回 1.0 绩点，挂科按及格算。
 * - 通过型成绩（合格/免修）曾按 0 绩点计入，把军训、毕业实习这类必修课
 *   变成 GPA 杀手。
 * - 去重键曾只用课程名，跨学期同名不同课被合并、学分凭空消失。
 * - 等级制经 parseFloat 得 NaN，而 NaN 比较恒为 false，重修取最高分失效。
 */
import { describe, it, expect } from "vitest";

import {
  gradeToGPA,
  isPassFailGrade,
  scoreToGPA,
  NJTECH_GPA_TABLE,
} from "@/lib/schools/njtech/grade-scale";
import { summarizeGrades } from "@/lib/schools/njtech/grades";
import type { GradeCourse } from "@/lib/schools/types";

// ════════════════════════════════════════════════════
// scoreToGPA — 百分制
// ════════════════════════════════════════════════════
describe("scoreToGPA", () => {
  it("各档下边界取该档绩点", () => {
    expect(scoreToGPA(90)).toBe(4.0);
    expect(scoreToGPA(86)).toBe(3.7);
    expect(scoreToGPA(82)).toBe(3.3);
    expect(scoreToGPA(79)).toBe(3.0);
    expect(scoreToGPA(75)).toBe(2.7);
    expect(scoreToGPA(71)).toBe(2.3);
    expect(scoreToGPA(68)).toBe(2.0);
    expect(scoreToGPA(64)).toBe(1.7);
    expect(scoreToGPA(60)).toBe(1.3);
  });

  it("各档上边界归入更高档", () => {
    expect(scoreToGPA(89)).toBe(3.7);
    expect(scoreToGPA(85)).toBe(3.3);
    expect(scoreToGPA(63)).toBe(1.3);
  });

  it("不及格与满分", () => {
    expect(scoreToGPA(59)).toBe(0);
    expect(scoreToGPA(0)).toBe(0);
    expect(scoreToGPA(100)).toBe(4.0);
  });

  it("对照表区间首尾相接、无空洞", () => {
    for (let i = 1; i < NJTECH_GPA_TABLE.length; i++) {
      expect(NJTECH_GPA_TABLE[i].max).toBe(NJTECH_GPA_TABLE[i - 1].min);
    }
  });
});

// ════════════════════════════════════════════════════
// gradeToGPA — 等级制与「不参与计算」
// ════════════════════════════════════════════════════
describe("gradeToGPA", () => {
  it("数字制走百分制换算", () => {
    expect(gradeToGPA("92")).toBe(4.0);
    expect(gradeToGPA("59")).toBe(0);
  });

  it("不及格必须是 0，不能被「及格」子串命中成 1.0", () => {
    expect(gradeToGPA("不及格")).toBe(0);
    expect(gradeToGPA("不合格")).toBe(0);
  });

  it("等级制正常档位", () => {
    expect(gradeToGPA("优秀")).toBe(4.0);
    expect(gradeToGPA("良好")).toBe(3.0);
    expect(gradeToGPA("中等")).toBe(2.0);
    expect(gradeToGPA("及格")).toBe(1.0);
  });

  it("通过型成绩返回 null（不参与计算），而不是 0", () => {
    expect(gradeToGPA("合格")).toBeNull();
    expect(gradeToGPA("通过")).toBeNull();
    expect(gradeToGPA("免修")).toBeNull();
    expect(gradeToGPA("免考")).toBeNull();
  });

  it("空值与未知标记返回 null，不做猜测", () => {
    expect(gradeToGPA("")).toBeNull();
    expect(gradeToGPA("   ")).toBeNull();
    expect(gradeToGPA("缓考")).toBeNull();
    expect(gradeToGPA("缺考")).toBeNull();
  });
});

describe("isPassFailGrade", () => {
  it("只认显式通过型标记", () => {
    expect(isPassFailGrade("合格")).toBe(true);
    expect(isPassFailGrade("免修")).toBe(true);
    expect(isPassFailGrade("不合格")).toBe(false);
    expect(isPassFailGrade("优秀")).toBe(false);
    expect(isPassFailGrade("88")).toBe(false);
    expect(isPassFailGrade("")).toBe(false);
  });
});

// ════════════════════════════════════════════════════
// summarizeGrades — 去重与 GPA 口径
// ════════════════════════════════════════════════════
function row(p: Partial<GradeCourse> & { course: string }): GradeCourse {
  return {
    score: "80",
    credit: "2",
    type: "必修",
    semester: "2026-2027学年第一学期",
    ...p,
  };
}

describe("summarizeGrades 去重", () => {
  it("跨学期同名不同课不合并（课程号不同）", () => {
    const out = summarizeGrades([
      row({ course: "大学体育", courseCode: "TY001", credit: "1", score: "85" }),
      row({ course: "大学体育", courseCode: "TY002", credit: "1", score: "90" }),
      row({ course: "大学体育", courseCode: "TY003", credit: "1", score: "78" }),
    ]);
    expect(out.allCourses).toHaveLength(3);
    expect(out.requiredCredits).toBe(3);
  });

  it("重修同一课程号取最高分", () => {
    const out = summarizeGrades([
      row({ course: "高等数学", courseCode: "MA001", score: "52" }),
      row({ course: "高等数学", courseCode: "MA001", score: "77" }),
    ]);
    expect(out.allCourses).toHaveLength(1);
    expect(out.allCourses[0].score).toBe("77");
  });

  it("等级制不会因 NaN 比较把高分挤掉", () => {
    // 先到的是等级制，后到的是数字分：数字分必须胜出
    const out = summarizeGrades([
      row({ course: "军事理论", courseCode: "JS001", score: "合格" }),
      row({ course: "军事理论", courseCode: "JS001", score: "88" }),
    ]);
    expect(out.allCourses).toHaveLength(1);
    expect(out.allCourses[0].score).toBe("88");
  });

  it("课程号缺失时回退到课程名，仍按课程性质区分", () => {
    const out = summarizeGrades([
      row({ course: "创新实践", type: "必修", score: "80" }),
      row({ course: "创新实践", type: "选修", score: "90" }),
    ]);
    expect(out.allCourses).toHaveLength(2);
  });
});

describe("summarizeGrades GPA 口径", () => {
  it("只计必修课", () => {
    const out = summarizeGrades([
      row({ course: "必修课", courseCode: "A1", type: "必修", score: "90", credit: "2" }),
      row({ course: "选修课", courseCode: "A2", type: "选修", score: "60", credit: "2" }),
    ]);
    expect(out.gpa).toBe("4.00");
    expect(out.requiredCredits).toBe(2);
    expect(out.requiredCourses).toBe(1);
  });

  it("通过型必修课不进 GPA 分子分母（此前记 0 绩点会拉塌 GPA）", () => {
    const out = summarizeGrades([
      row({ course: "专业课", courseCode: "A1", type: "必修", score: "90", credit: "3" }),
      row({ course: "军训", courseCode: "A2", type: "必修", score: "合格", credit: "2" }),
      row({ course: "毕业实习", courseCode: "A3", type: "必修", score: "免修", credit: "4" }),
    ]);
    expect(out.gpa).toBe("4.00");
    // 分母只有专业课的 3 学分
    expect(out.requiredCredits).toBe(3);
    // requiredCourses 统计的是必修课门数，通过型也算在内
    expect(out.requiredCourses).toBe(3);
  });

  it("等级制不及格按 0 绩点计入（而非 1.0）", () => {
    const out = summarizeGrades([
      row({ course: "科目甲", courseCode: "A1", type: "必修", score: "不及格", credit: "2" }),
      row({ course: "科目乙", courseCode: "A2", type: "必修", score: "优秀", credit: "2" }),
    ]);
    // (0*2 + 4*2) / 4 = 2.00；若不及格被判成 1.0 则会是 2.50
    expect(out.gpa).toBe("2.00");
    expect(out.requiredCredits).toBe(4);
  });

  it("零学分课程不参与", () => {
    const out = summarizeGrades([
      row({ course: "零学分课", courseCode: "A1", type: "必修", score: "90", credit: "0" }),
    ]);
    expect(out.gpa).toBe("0.00");
    expect(out.requiredCredits).toBe(0);
    expect(out.requiredCourses).toBe(0);
  });

  it("无有效成绩时 GPA 为 0.00 而非 NaN", () => {
    const out = summarizeGrades([]);
    expect(out.gpa).toBe("0.00");
    expect(out.requiredCredits).toBe(0);
    expect(out.allCourses).toEqual([]);
  });

  it("重复汇总同一输入结果稳定（幂等）", () => {
    const input = [
      row({ course: "科目甲", courseCode: "A1", score: "85", credit: "3" }),
      row({ course: "科目甲", courseCode: "A1", score: "91", credit: "3" }),
      row({ course: "科目乙", courseCode: "A2", score: "合格", credit: "1" }),
    ];
    expect(summarizeGrades(input)).toEqual(summarizeGrades(input));
    expect(summarizeGrades(summarizeGrades(input).allCourses).gpa).toBe(
      summarizeGrades(input).gpa,
    );
  });
});
