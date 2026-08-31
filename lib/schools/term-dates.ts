/**
 * 学期第 1 周周一的解析 —— 单一出口。
 *
 * 此前四处各自写死一个日期兜底：njtech 适配器的 "2026-09-07"、hebau 的
 * DEFAULT_WEEK1_MONDAY、以及 fetch/all 与 fetch/schedule 两个路由里的
 * DEFAULT_SEMESTER_INFO。这些常量一旦被时间超过就持续产出错误周次，而且没有
 * 任何一处对「当前学期到底哪天开学」负责，改一个漏三个。
 *
 * 这里的约定：已知学期查校历实测值，未知学期按开学月首个周一估算，并如实标记
 * estimated，绝不用一个过期的字面量假装知道。
 *
 * 零依赖叶子模块，服务端与客户端都可安全引入。
 */

export interface TermInfo {
  /** 学年起始年，如 2026 表示 2026-2027 学年 */
  year: string;
  /** "1" 秋冬学期，"2" 春夏学期 */
  semester: string;
  /** 第 1 周周一，YYYY-MM-DD（本地时区语义，与 schedule.getWeekNumber 一致） */
  week1Monday: string;
  /** true 表示 week1Monday 来自估算而非校历实测 */
  estimated: boolean;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 某年某月的第一个周一，YYYY-MM-DD。
 * @param month 1-12
 */
export function firstMondayOf(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  // getDay(): 0=周日 … 6=周六。(8 - day) % 7 = 距最近的周一（含当天）的天数。
  d.setDate(1 + ((8 - d.getDay()) % 7));
  return toIsoDate(d);
}

/**
 * 估算开学日：秋冬学期取 9 月首个周一，春夏学期取次年 3 月首个周一。
 * 仅在校历未录入时使用；实测值一旦拿到就应写入各校的已知表。
 */
export function estimateWeek1Monday(academicYear: number, semester: string): string {
  return semester === "2"
    ? firstMondayOf(academicYear + 1, 3)
    : firstMondayOf(academicYear, 9);
}

/**
 * 按当前月份推学年与学期。
 *
 * @param secondSemesterMonths 春夏学期覆盖的月份区间（含端点）。各校不同：
 *   南工大 [2, 6]、河北农大 [2, 7]。学校未知时用较宽的 [2, 7]。
 */
export function currentTerm(
  now: Date = new Date(),
  secondSemesterMonths: readonly [number, number] = [2, 7],
): { year: string; semester: string } {
  const month = now.getMonth() + 1;
  const [lo, hi] = secondSemesterMonths;
  const isSecond = month >= lo && month <= hi;
  return {
    // 春夏学期属于上一个学年：2027 年 3 月是 2026-2027 学年第二学期
    year: String(isSecond ? now.getFullYear() - 1 : now.getFullYear()),
    semester: isSecond ? "2" : "1",
  };
}

/** 已知表优先，查不到则估算并标记 estimated。 */
export function resolveTerm(
  knownWeek1Mondays: Readonly<Record<string, string>>,
  term: { year: string; semester: string },
): TermInfo {
  const known = knownWeek1Mondays[`${term.year}-${term.semester}`];
  return {
    year: term.year,
    semester: term.semester,
    week1Monday: known ?? estimateWeek1Monday(Number(term.year), term.semester),
    estimated: known === undefined,
  };
}
