/**
 * GPA 计算引擎
 *
 * 支持:
 * - 百分制 → 4.0 GPA (NJTECH标准算法)
 * - 五级制 (优/良/中/及格/不及格)
 * - 不同学分权重
 * - 学期GPA + 累计GPA
 */

export interface Course {
  id: string;
  name: string;
  credit: number;
  score?: number;
  grade?: GradeLevel;
  semester: string;
}

export type GradeLevel = "A" | "B" | "C" | "D" | "F";

// ── 统一 GPA 颜色方案 ──
export function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return "#22c55e";
  if (gpa >= 2.5) return "#2a4494";
  if (gpa >= 1.5) return "#f59e0b";
  return "#ef4444";
}

// ── 百分制 → 4.0 GPA (NJTECH标准) ──
export function scoreToGPA(score: number): number {
  if (score >= 90) return 4.0;
  if (score >= 86) return 3.7;
  if (score >= 82) return 3.3;
  if (score >= 79) return 3.0;
  if (score >= 75) return 2.7;
  if (score >= 71) return 2.3;
  if (score >= 68) return 2.0;
  if (score >= 64) return 1.7;
  if (score >= 60) return 1.3;
  return 0;
}

function gradeToGPA(grade: GradeLevel): number {
  switch (grade) {
    case "A": return 4.0;
    case "B": return 3.0;
    case "C": return 2.0;
    case "D": return 1.0;
    case "F": return 0;
  }
}

export function calculateGPA(courses: Course[]): {
  semesterGPA: number;
  totalCredits: number;
  totalPoints: number;
  completed: number;
  remaining: number;
} {
  const graded = courses.filter(c => c.score !== undefined || c.grade !== undefined);
  if (graded.length === 0) return { semesterGPA: 0, totalCredits: 0, totalPoints: 0, completed: 0, remaining: courses.length };

  let totalPoints = 0;
  let totalCredits = 0;

  for (const c of graded) {
    const gpa = c.score !== undefined ? scoreToGPA(c.score) : gradeToGPA(c.grade!);
    totalPoints += gpa * c.credit;
    totalCredits += c.credit;
  }

  return {
    semesterGPA: totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0,
    totalCredits,
    totalPoints: Math.round(totalPoints * 100) / 100,
    completed: graded.length,
    remaining: courses.length - graded.length,
  };
}

export function predictTarget(
  courses: Course[],
  currentGPA: number,
  targetGPA: number
): { possible: boolean; neededAvg: number; remainingCredits: number } | null {
  const remaining = courses.filter(c => c.score === undefined && c.grade === undefined);
  const remainingCredits = remaining.reduce((s, c) => s + c.credit, 0);
  if (remainingCredits === 0) return null;

  const graded = courses.filter(c => c.score !== undefined || c.grade !== undefined);
  const gradedCredits = graded.reduce((s, c) => s + c.credit, 0);
  const totalCredits = gradedCredits + remainingCredits;

  const currentPoints = currentGPA * gradedCredits;
  const neededPoints = targetGPA * totalCredits - currentPoints;
  const neededAvg = neededPoints / remainingCredits;

  return {
    possible: neededAvg <= 4.0,
    neededAvg: Math.round(neededAvg * 100) / 100,
    remainingCredits,
  };
}

export const CURRENT_SEMESTER = "2025-2026-2";

export function getSemesterLabel(semester: string): string {
  const [y1, y2, s] = semester.split("-");
  const half = s === "1" ? "上" : "下";
  return `${y1}-${y2} 第${s}学期`;
}

// ── 成绩样式工具 ──
export function getScoreBadgeStyle(score: string): { bg: string; color: string } {
  const s = parseFloat(score);
  if (score === "优秀") return { bg: "rgba(34,197,94,0.12)", color: "#16a34a" };
  if (isNaN(s)) return { bg: "rgba(42,68,148,0.10)", color: "#2a4494" };
  if (s >= 95) return { bg: "rgba(34,197,94,0.12)", color: "#16a34a" };
  if (s >= 90) return { bg: "rgba(34,197,94,0.10)", color: "#22c55e" };
  if (s >= 80) return { bg: "rgba(42,68,148,0.10)", color: "#2a4494" };
  if (s >= 70) return { bg: "rgba(245,158,11,0.12)", color: "#d97706" };
  if (s >= 60) return { bg: "rgba(245,158,11,0.08)", color: "#b45309" };
  return { bg: "rgba(239,68,68,0.10)", color: "#dc2626" };
}

export function getScoreDisplay(score: string): string {
  if (score === "优秀") return "优";
  if (score === "良好") return "良";
  if (score === "中等") return "中";
  if (score === "及格") return "及";
  if (score === "不及格") return "不";
  return score;
}
