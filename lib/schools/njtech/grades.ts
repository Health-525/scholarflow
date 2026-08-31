/**
 * NJTECH 全部成绩 + GPA 计算
 * 搬自 timetable/scripts/fetch_grades_all.js，改为 TypeScript 函数化
 */

import type { GradeResult, GradeCourse } from "../types";

import { gradeToGPA } from "./grade-scale";
import { createClientWithCookie } from "./jwgl";

const BASE = "https://jwgl.njtech.edu.cn";

// ── GPA 计算 ────────────────────────────────────────────────

/**
 * 判断是否必修课
 */
function isRequired(type: string): boolean {
  const t = (type || "").trim();
  return t === "必修" || t.startsWith("必修") || (t.includes("必") && !t.includes("选修"));
}

/**
 * 成绩数值化，仅用于重修比较。
 * 等级制无法与百分制比较大小，统一返回 -1（低于任何有效分数）——
 * 直接用 parseFloat 比较会得到 NaN，而 NaN 的任何比较都是 false，
 * 导致「先到的那条永远赢」，重修取最高分失效。
 */
function numScore(score: string): number {
  const n = parseFloat(score);
  return Number.isNaN(n) ? -1 : n;
}

// ── 全部成绩抓取 ────────────────────────────────────────────

/**
 * 抓取全部成绩并计算 GPA
 * @param cookie - 登录后的 cookie
 * @param username - 学号（用于标识）
 */
export async function fetchAllGrades(
  cookie: string,
  _username: string
): Promise<GradeResult> {
  const client = createClientWithCookie(BASE, cookie);

  const all: GradeCourse[] = [];
  const endYear = new Date().getFullYear();

  // 遍历所有学年学期
  for (let y = 2023; y <= endYear; y++) {
    for (const q of [3, 12]) {
      const resp = await client.req(
        "/cjcx/cjcx_cxDgXscj.html?doType=query&gnmkdm=N305005",
        {
          method: "POST",
          body: `xnm=${y}&xqm=${q}&_search=false&nd=${Date.now()}&queryModel.showCount=200&queryModel.currentPage=1`,
        }
      );

      try {
        const data = JSON.parse(resp.body);
        if (data.items) {
          for (const g of data.items) {
            all.push({
              course: g.kcmc || g.kch || "",
              // 课程号单独留字段：它是去重的标识符，不能只当课程名的兜底
              courseCode: g.kch || "",
              score: g.cj || g.bfzcj || "",
              credit: g.xf || "",
              type: g.kcxzmc || "",
              semester: (g.xnmmc || "") + (g.xqmmc || ""),
            });
          }
        }
      } catch {
        // Skip failed semester
      }
    }
  }

  return summarizeGrades(all);
}

/**
 * 原始成绩行 → 去重后的课程列表 + GPA。纯函数，与网络无关，便于回归测试。
 */
export function summarizeGrades(all: GradeCourse[]): GradeResult {
  // 去重取最高分。键 = 课程号 + 课程性质：
  // 重修同一门课取最高分是本意；但「大学体育 1/2/3」「大学英语 1/2/3」这类
  // 跨学期同名课的课程号不同，只按课程名去重会把它们合并成一条、学分凭空消失。
  const best = new Map<string, GradeCourse>();
  for (const g of all) {
    const k = `${g.courseCode || g.course}|${g.type || ""}`;
    const prev = best.get(k);
    if (!prev || numScore(g.score) > numScore(prev.score)) {
      best.set(k, g);
    }
  }
  const deduped = [...best.values()];

  // GPA 计算：只计必修课，且排除通过型/未知型成绩。
  // gradeToGPA 返回 null 表示「不参与计算」，分子分母都不能计——
  // 军训、毕业实习这类记「合格」的必修课按 0 绩点计入会把 GPA 拉塌。
  const required = deduped.filter(
    (g) => isRequired(g.type) && parseFloat(g.credit) > 0
  );
  let tg = 0;
  let tc = 0;
  for (const g of required) {
    const gp = gradeToGPA(g.score);
    if (gp === null) continue;
    const cr = parseFloat(g.credit) || 0;
    tg += gp * cr;
    tc += cr;
  }
  const gpa = tc > 0 ? (tg / tc).toFixed(2) : "0.00";

  return {
    gpa,
    requiredCredits: tc,
    requiredCourses: required.length,
    allCourses: deduped,
  };
}


