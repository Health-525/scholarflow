/**
 * GPA 计算引擎
 *
 * 支持:
 * - 百分制 → 4.0 GPA (标准算法)
 * - 五级制 (优/良/中/及格/不及格)
 * - 不同学分权重
 * - 学期GPA + 累计GPA
 * - 目标预测
 */
export interface Course {
  id: string;
  name: string;
  credit: number;    // 学分
  score?: number;     // 百分制分数 (0-100)
  grade?: GradeLevel; // 五级制
  semester: string;   // "2025-2026-2" 格式
}

export type GradeLevel = "A" | "B" | "C" | "D" | "F";

// 南京工业大学 百分制 → 4.0 GPA 映射
function scoreToGPA(score: number): number {
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

  // targetGPA = (currentPoints + neededPoints) / totalCredits
  // neededPoints = targetGPA * totalCredits - currentPoints
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
