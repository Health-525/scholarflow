import { describe, it, expect } from "vitest";
import { calculateGPA, predictTarget, type Course } from "@/lib/gpa";

describe("calculateGPA", () => {
  it("空课程表返回0", () => {
    expect(calculateGPA([]).semesterGPA).toBe(0);
  });

  it("单课程95分=4.0", () => {
    const courses: Course[] = [{ id: "1", name: "高数", credit: 4, score: 95, semester: "2025-2026-2" }];
    expect(calculateGPA(courses).semesterGPA).toBe(4.0);
  });

  it("单课程60分=1.0", () => {
    const courses: Course[] = [{ id: "1", name: "高数", credit: 3, score: 60, semester: "2025-2026-2" }];
    expect(calculateGPA(courses).semesterGPA).toBe(1.0);
  });

  it("多课程加权平均", () => {
    const courses: Course[] = [
      { id: "1", name: "A", credit: 3, score: 90, semester: "x" },  // 3.8 * 3 = 11.4
      { id: "2", name: "B", credit: 2, score: 80, semester: "x" },  // 3.2 * 2 = 6.4
    ];
    const gpa = calculateGPA(courses);
    // (11.4 + 6.4) / 5 = 3.56
    expect(gpa.semesterGPA).toBe(3.56);
  });

  it("未出分课程不计入", () => {
    const courses: Course[] = [
      { id: "1", name: "A", credit: 3, score: 90, semester: "x" },
      { id: "2", name: "B", credit: 2, semester: "x" },  // no score
    ];
    expect(calculateGPA(courses).semesterGPA).toBe(3.8);
    expect(calculateGPA(courses).remaining).toBe(1);
  });
});

describe("predictTarget", () => {
  it("可以达成时返回数据", () => {
    const courses: Course[] = [
      { id: "1", name: "A", credit: 3, score: 90, semester: "x" },  // 3.8
      { id: "2", name: "B", credit: 3, semester: "x" },  // no score
    ];
    const r = predictTarget(courses, 3.8, 3.9);
    expect(r).not.toBeNull();
    expect(r!.possible).toBe(true);
    // currentGPA=3.8, 3 credits. Need 3.9*6=23.4, current=3.8*3=11.4, need 12.0/3=4.0
    expect(r!.neededAvg).toBe(4.0);
  });

  it("无法达成时possible=false", () => {
    const courses: Course[] = [
      { id: "1", name: "A", credit: 3, score: 60, semester: "x" },  // 1.0
      { id: "2", name: "B", credit: 1, semester: "x" },
    ];
    const r = predictTarget(courses, 1.0, 4.0);
    expect(r).not.toBeNull();
    expect(r!.possible).toBe(false);
  });

  it("没剩余课程时返回null", () => {
    const courses: Course[] = [{ id: "1", name: "A", credit: 3, score: 90, semester: "x" }];
    expect(predictTarget(courses, 3.8, 4.0)).toBeNull();
  });
});
