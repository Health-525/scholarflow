import { normalizeDate } from "./timezone";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Mon..7=Sun

export interface RawScheduleMeta {
  tz?: string; // e.g. Asia/Shanghai
  week1_monday: string; // ISO date
  semester?: string; // e.g. "2025-2026-2"
  schoolId?: string; // e.g. "njtech"
}

export interface RawCourse {
  title: string;
  weekday: Weekday;
  periods: number[]; // e.g. [1,2]
  weeks: string; // e.g. "2-13" or "1,3,5-7"
  location?: string;
  teacher?: string;
}

export interface RawSpecialItem {
  title: string;
  weekday: Weekday | Weekday[];
  weeks: string;
  times: { start: string; end: string }[];
  location?: string;
  note?: string;
}

export interface RawScheduleData {
  meta: RawScheduleMeta;
  periodTimes?: Record<string, string>; // {"1":"08:10-08:55", ...}
  courses?: RawCourse[];
  special?: RawSpecialItem[];
}

export interface CourseView {
  kind: "course";
  title: string;
  periods: number[];
  timeText?: string; // e.g. 08:10-09:50
  location?: string;
  teacher?: string;
}

export interface SpecialView {
  kind: "special";
  title: string;
  timeText: string; // e.g. 09:00-11:00
  location?: string;
}

export interface HolidayView {
  kind: "holiday";
  title: string;
  timeText?: string;
  location?: string;
}

export type DayItem = CourseView | SpecialView | HolidayView;

/**
 * 解析周次规格字符串，如 "2-13" 或 "1,3,5-7"
 */
export function parseWeekSpec(spec: string): number[] {
  const s = String(spec || "").replace(/，/g, ",");
  const out = new Set<number>();
  for (const raw of s.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    if (part.includes("-")) {
      const [aStr, bStr] = part.split("-", 2);
      const a = Number(aStr);
      const b = Number(bStr);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) out.add(i);
    } else {
      const n = Number(part);
      if (Number.isFinite(n)) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

/**
 * 获取日期对应的星期几 (1-7, 周一到周日)
 */
export function weekday1to7(d: Date): Weekday {
  const js = d.getDay();
  return (js === 0 ? 7 : js) as Weekday;
}

/**
 * 计算给定日期是第几周
 *
 * 注意：week1MondayIso 是 "YYYY-MM-DD" 格式，解析为本地时间午夜（与 schedule.json 中的语义一致）。
 */
export function getWeekNumber(d: Date, week1MondayIso: string): number {
  const [y, m, day] = week1MondayIso.split("-").map(Number);
  const week1 = new Date(y, m - 1, day); // 本地时间午夜，跨平台一致
  const dd = normalizeDate(d);
  const diffDays = Math.floor((dd.getTime() - week1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/**
 * 根据节次组合时间文本
 */
function combinePeriodTime(
  periodTimes: Record<string, string> | undefined,
  periods: number[]
): string | undefined {
  if (!periodTimes || !periods?.length) return undefined;
  const first = periodTimes[String(periods[0])] || "";
  const last = periodTimes[String(periods[periods.length - 1])] || "";
  if (first.includes("-") && last.includes("-")) {
    const start = first.split("-", 1)[0].trim();
    const end = last.split("-", 2)[1].trim();
    if (start && end) return `${start}-${end}`;
  }
  return first || last || undefined;
}

/**
 * 验证并解析课表数据
 */
export function parseSchedule(raw: unknown): RawScheduleData {
  const r = raw as { meta?: { week1_monday?: unknown } } | null;
  if (!r || typeof r !== "object" || typeof r.meta?.week1_monday !== "string") {
    throw new Error("Invalid schedule.json: missing meta.week1_monday");
  }
  return raw as RawScheduleData;
}

/**
 * 获取指定日期的课程列表
 */
export function getItemsForDate(
  schedule: RawScheduleData,
  date: Date
): { weekNum: number; items: DayItem[] } {
  const weekNum = getWeekNumber(date, schedule.meta.week1_monday);
  const wday = weekday1to7(date);

  const items: DayItem[] = [];

  // specials
  for (const s of schedule.special || []) {
    const weeks = parseWeekSpec(s.weeks);
    if (weeks.length && !weeks.includes(weekNum)) continue;

    const wdays = Array.isArray(s.weekday) ? s.weekday : [s.weekday];
    if (!wdays.includes(wday)) continue;

    for (const t of s.times || []) {
      const timeText = [t.start, t.end].filter(Boolean).join("-");
      items.push({ kind: "special", title: s.title, timeText, location: s.location });
    }
  }

  // courses
  for (const c of schedule.courses || []) {
    if (c.weekday !== wday) continue;
    const weeks = parseWeekSpec(c.weeks);
    if (weeks.length && !weeks.includes(weekNum)) continue;

    const timeText = combinePeriodTime(schedule.periodTimes, c.periods);
    items.push({
      kind: "course",
      title: c.title,
      periods: c.periods || [],
      timeText,
      location: c.location,
      teacher: c.teacher,
    });
  }

  // sort: specials first by time, then courses by first period
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "special" ? -1 : 1;
    if (a.kind === "special" && b.kind === "special")
      return a.timeText.localeCompare(b.timeText);
    const ap = (a as CourseView).periods?.[0] ?? 999;
    const bp = (b as CourseView).periods?.[0] ?? 999;
    return ap - bp;
  });

  return { weekNum, items };
}


