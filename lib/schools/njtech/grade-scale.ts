/**
 * NJTECH 绩点换算规则 —— 唯一真值。
 *
 * 零依赖叶子模块：教务适配层（服务端，会拉起 https/crypto）与 GPA 展示层
 * （客户端）都从这里取。此前同一套阈值有两份——njtech/grades.ts 里的 if 链
 * 和 lib/gpa.ts 里的 GPA_TABLE——改一处必然漏另一处。
 *
 * 只描述南工大的规则。其他学校（如 hebau 的 5.0 满绩）各有自己的换算，
 * 不要往这里合并。
 */

export interface GPATableEntry {
  min: number;
  /** 右开区间上界 */
  max: number;
  gpa: number;
  /** 展示用区间文本 */
  range: string;
}

/** 百分制 → 4.0 制对照表，区间为 [min, max) */
export const NJTECH_GPA_TABLE: readonly GPATableEntry[] = [
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

/** 百分制分数 → 绩点。落在 [0, 101) 之外按 0 处理。 */
export function scoreToGPA(score: number): number {
  for (const entry of NJTECH_GPA_TABLE) {
    if (score >= entry.min && score < entry.max) return entry.gpa;
  }
  return 0;
}

/**
 * 成绩（数字制或等级制）→ 绩点。
 *
 * 返回 `null` 表示该成绩**不参与** GPA 计算，与「绩点为 0」是两回事：
 * - 通过型（合格 / 通过 / 免修 / 免考）有学分、不计绩点。军训、毕业实习、
 *   部分实验课记的就是「合格」，按 0 绩点计入会把整个 GPA 拉塌。
 * - 缓考 / 缺考 / 空值这类未知标记不做猜测，同样移出计算。
 *
 * 调用方必须显式处理 `null`（跳过该门课，分子分母都不计），不能用 `?? 0`。
 */
export function gradeToGPA(score: string): number | null {
  const numeric = parseFloat(score);
  if (!Number.isNaN(numeric)) return scoreToGPA(numeric);

  const t = String(score ?? "").trim();
  if (!t) return null;

  // 否定形式必须先判：「不及格」是「及格」的超串、「不合格」是「合格」的超串。
  // 子串匹配放在后面会把挂科判成 1.0 绩点。
  if (t.includes("不及格") || t.includes("不合格")) return 0;
  if (t.includes("优秀")) return 4.0;
  if (t.includes("良好")) return 3.0;
  if (t.includes("中等")) return 2.0;
  if (t.includes("及格")) return 1.0;

  // 通过型与未知型：不参与计算
  return null;
}

/** 是否通过型成绩：有学分、不计绩点。仅认显式标记，不把未知成绩算进来。 */
export function isPassFailGrade(score: string): boolean {
  if (!Number.isNaN(parseFloat(score))) return false;
  const t = String(score ?? "").trim();
  if (!t) return false;
  if (t.includes("不及格") || t.includes("不合格")) return false;
  return /(合格|通过|免修|免考)/.test(t);
}
