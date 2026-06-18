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

// ── 统一 GPA 颜色方案 — theme-aware, SSR-safe via CSS variables ──
export function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return "var(--gpa-excellent)";
  if (gpa >= 2.5) return "var(--gpa-good)";
  if (gpa >= 1.5) return "var(--gpa-average)";
  return "var(--gpa-poor)";
}

export function gpaColorRGB(gpa: number): string {
  if (gpa >= 3.5) return "var(--gpa-excellent-rgb)";
  if (gpa >= 2.5) return "var(--gpa-good-rgb)";
  if (gpa >= 1.5) return "var(--gpa-average-rgb)";
  return "var(--gpa-poor-rgb)";
}

export function gpaColorClasses(gpa: number): { colorClass: string; iconBgClass: string } {
  if (gpa >= 3.5) return { colorClass: "text-green-600 dark:text-green-400", iconBgClass: "bg-green-500/[0.07] dark:bg-green-400/10" };
  if (gpa >= 2.5) return { colorClass: "text-indigo-800 dark:text-indigo-400", iconBgClass: "bg-indigo-500/[0.07] dark:bg-indigo-400/10" };
  if (gpa >= 1.5) return { colorClass: "text-amber-600 dark:text-amber-400", iconBgClass: "bg-amber-500/[0.07] dark:bg-amber-400/10" };
  return { colorClass: "text-red-500 dark:text-red-400", iconBgClass: "bg-red-500/[0.07] dark:bg-red-400/10" };
}

// ── 统一的百分制 → 4.0 GPA 对照表（NJTECH标准） ──
export interface GPATableEntry {
  min: number;
  max: number; // 右开区间
  gpa: number;
  range: string;
}

export const GPA_TABLE: readonly GPATableEntry[] = [
  { min: 90, max: 101, gpa: 4.0, range: "≥90" },
  { min: 86, max: 90, gpa: 3.7, range: "86-89" },
  { min: 82, max: 86, gpa: 3.3, range: "82-85" },
  { min: 79, max: 82, gpa: 3.0, range: "79-81" },
  { min: 75, max: 79, gpa: 2.7, range: "75-78" },
  { min: 71, max: 75, gpa: 2.3, range: "71-74" },
  { min: 68, max: 71, gpa: 2.0, range: "68-70" },
  { min: 64, max: 68, gpa: 1.7, range: "64-67" },
  { min: 60, max: 64, gpa: 1.3, range: "60-63" },
  { min: 0, max: 60, gpa: 0, range: "<60" },
];

export function scoreToGPA(score: number): number {
  for (const entry of GPA_TABLE) {
    if (score >= entry.min && score < entry.max) {
      return entry.gpa;
    }
  }
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

export function getSemesterLabel(semester: string): string {
  // 兼容两种格式: "2024-2025-1" 和 "2024-20251"
  const parts = semester.split("-");
  if (parts.length === 3) {
    const [y1, y2, s] = parts;
    return `${y1}-${y2} 第${s}学期`;
  }
  // "2024-20251" → y1=2024, y2s="20251" → y2="2025", s="1"
  const [y1, y2s] = parts;
  if (y2s && y2s.length >= 5) {
    const y2 = y2s.slice(0, 4);
    const s = y2s.slice(4);
    return `${y1}-${y2} 第${s}学期`;
  }
  return semester;
}

// ── 成绩样式工具 — theme-aware, SSR-safe via CSS variables ──
export function getScoreBadgeStyle(score: string): { bg: string; color: string } {
  const s = parseFloat(score);
  if (score === "优秀") return { bg: "rgba(var(--status-success-rgb), 0.12)", color: "var(--status-success)" };
  if (isNaN(s)) return { bg: "rgba(var(--status-info-rgb), 0.10)", color: "var(--status-info)" };
  if (s >= 95) return { bg: "rgba(var(--status-success-rgb), 0.12)", color: "var(--status-success)" };
  if (s >= 90) return { bg: "rgba(var(--status-success-rgb), 0.10)", color: "var(--status-success)" };
  if (s >= 80) return { bg: "rgba(var(--status-info-rgb), 0.10)", color: "var(--status-info)" };
  if (s >= 70) return { bg: "rgba(var(--status-warning-rgb), 0.12)", color: "var(--status-warning)" };
  if (s >= 60) return { bg: "rgba(var(--status-warning-rgb), 0.08)", color: "var(--status-warning)" };
  return { bg: "rgba(var(--status-error-rgb), 0.10)", color: "var(--status-error)" };
}

export function getScoreDisplay(score: string): string {
  if (score === "优秀") return "优";
  if (score === "良好") return "良";
  if (score === "中等") return "中";
  if (score === "及格") return "及";
  if (score === "不及格") return "不";
  return score;
}
