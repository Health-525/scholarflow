import { getHolidayInfo } from "./holidays";
import type {
  RawCourse,
  RawScheduleData,
  DayItem,
  CourseView,
  Weekday,
} from "./schedule";
import {
  getWeekNumber,
  weekday1to7,
  parseWeekSpec,
} from "./schedule";

export type AdjustmentMode = "once" | "longterm";
export type AdjustmentType = "move" | "cancel";

export interface Adjustment {
  id: string;
  // 类型：move=调课，cancel=取消单次/长期
  type: AdjustmentType;
  // 原课信息
  sourceWeekday: Weekday;
  sourcePeriods: number[];
  // 目标信息（cancel 类型可省略）
  targetWeekday?: Weekday;
  targetPeriods?: number[];
  // 模式
  mode: AdjustmentMode;
  // 生效周次（单次：具体某周；长期：从第N周开始）
  startWeek: number;
  // 单次模式下的具体周次（可选，默认等于 startWeek）
  specificWeek?: number;
  // 单次移动时，原课程被移动的具体周次（不填则与 specificWeek 相同）
  sourceSpecificWeek?: number;
  createdAt: number;
}

export interface AdjustmentDraft {
  type: AdjustmentType;
  sourceWeekday: Weekday;
  sourcePeriods: number[];
  targetWeekday?: Weekday;
  targetPeriods?: number[];
  mode?: AdjustmentMode;
  startWeek?: number;
  specificWeek?: number;
  sourceSpecificWeek?: number;
}

export interface ConflictInfo {
  courseTitle: string;
  weekday: Weekday;
  periods: number[];
  message: string;
}

export type AdjustmentMutationResult = Adjustment[];

const LEGACY_STORAGE_KEY = "sf_adjustments_v1";

function getStorageKey(schoolId?: string | null, userId?: string | null): string {
  const sid = schoolId || "default";
  const uid = userId || "default";
  return `${LEGACY_STORAGE_KEY}:${sid}:${uid}`;
}

function readRaw(key: string): Adjustment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Adjustment[];
    if (!Array.isArray(parsed)) return [];
    // 兼容旧数据：未设置 type 的默认为 move
    return parsed.map((adj) => ({
      ...adj,
      type: adj.type || "move",
    }));
  } catch {
    return [];
  }
}

function writeRaw(key: string, adjustments: Adjustment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(adjustments));
  } catch {}
}

/**
 * 从 localStorage 读取调课记录。
 * 优先读取账号隔离 key；若不存在则尝试迁移旧 key `sf_adjustments_v1`，
 * 并在登录后将匿名 default key 数据迁移到当前账号。
 */
export function loadAdjustments(
  schoolId?: string | null,
  userId?: string | null
): Adjustment[] {
  const key = getStorageKey(schoolId, userId);
  const scoped = readRaw(key);
  if (scoped.length > 0) return scoped;

  if (typeof window !== "undefined") {
    // 迁移旧 key（无账号隔离时的老数据）
    const legacy = readRaw(LEGACY_STORAGE_KEY);
    if (legacy.length > 0) {
      writeRaw(key, legacy);
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
      return legacy;
    }

    // 登录后，将匿名 default key 的数据迁移到当前账号
    if (schoolId && userId) {
      const defaultKey = getStorageKey("default", "default");
      const anonymous = readRaw(defaultKey);
      if (anonymous.length > 0) {
        writeRaw(key, anonymous);
        try {
          localStorage.removeItem(defaultKey);
        } catch {}
        return anonymous;
      }
    }
  }
  return [];
}

/**
 * 保存调课记录到 localStorage（账号隔离）
 */
export function saveAdjustments(
  adjustments: Adjustment[],
  schoolId?: string | null,
  userId?: string | null
): void {
  writeRaw(getStorageKey(schoolId, userId), adjustments);
}

/**
 * 根据源位置查找匹配的课程
 */
export function findCourseBySource(
  schedule: RawScheduleData,
  weekday: Weekday,
  periods: number[]
): RawCourse | undefined {
  return (schedule.courses || []).find(
    (c) => c.weekday === weekday && arraysEqual(c.periods, periods)
  );
}

/**
 * 检查目标位置是否与现有课程冲突。
 * 返回冲突列表（空数组表示无冲突）。
 */
export function findConflicts(
  schedule: RawScheduleData,
  targetWeekday: Weekday,
  targetPeriods: number[],
  excludeSource?: { weekday: Weekday; periods: number[] }
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  for (const c of schedule.courses || []) {
    if (c.weekday !== targetWeekday) continue;
    if (
      excludeSource &&
      c.weekday === excludeSource.weekday &&
      arraysEqual(c.periods, excludeSource.periods)
    )
      continue;

    const overlap = c.periods.some((p) => targetPeriods.includes(p));
    if (overlap) {
      conflicts.push({
        courseTitle: c.title,
        weekday: c.weekday,
        periods: c.periods,
        message: `与《${c.title}》冲突（第 ${c.periods.join("、")} 节）`,
      });
    }
  }
  return conflicts;
}

/**
 * 校验并新增一条调课记录。
 * 失败时抛出 Error，成功时返回新的调课记录数组。
 */
export function addAdjustment(
  schedule: RawScheduleData,
  adjustments: Adjustment[],
  draft: AdjustmentDraft,
  schoolId?: string | null,
  userId?: string | null
): Adjustment[] {
  const sourcePeriods = [...draft.sourcePeriods].sort((a, b) => a - b);

  if (sourcePeriods.length === 0) {
    throw new Error("请选择要调走的节次");
  }

  const course = findCourseBySource(schedule, draft.sourceWeekday, sourcePeriods);
  if (!course) {
    throw new Error("源位置没有对应课程，无法调课");
  }

  // 检查是否与现有调课冲突（同一源位置 + 源生效周次重叠）
  const existingSourceAdj = adjustments.find(
    (adj) =>
      adj.sourceWeekday === draft.sourceWeekday &&
      arraysEqual(adj.sourcePeriods, sourcePeriods) &&
      isSourceOverlap(adj, draft)
  );
  if (existingSourceAdj) {
    throw new Error("该课程在相同生效范围内已有调课记录");
  }

  let newAdjustment: Adjustment;

  if (draft.type === "cancel") {
    const startWeek = draft.startWeek ?? 1;
    newAdjustment = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
      type: "cancel",
      sourceWeekday: draft.sourceWeekday,
      sourcePeriods,
      mode: draft.mode || "once",
      startWeek,
      specificWeek: draft.mode === "once" ? (draft.specificWeek ?? startWeek) : undefined,
      createdAt: Date.now(),
    };
  } else {
    // move
    if (!draft.targetWeekday || !draft.targetPeriods?.length) {
      throw new Error("请选择目标位置");
    }
    const targetPeriods = [...draft.targetPeriods].sort((a, b) => a - b);

    if (sourcePeriods.length !== targetPeriods.length) {
      throw new Error("目标节次数必须与源节次数相同");
    }
    const mode = draft.mode || "longterm";
    const startWeek = draft.startWeek ?? 1;
    const specificWeek = mode === "once" ? (draft.specificWeek ?? startWeek) : undefined;
    const sourceSpecificWeek = mode === "once" ? (draft.sourceSpecificWeek ?? specificWeek) : undefined;

    if (
      draft.sourceWeekday === draft.targetWeekday &&
      arraysEqual(sourcePeriods, targetPeriods) &&
      (mode === "longterm" || sourceSpecificWeek === specificWeek)
    ) {
      throw new Error("源位置与目标位置相同");
    }

    newAdjustment = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
      type: "move",
      sourceWeekday: draft.sourceWeekday,
      sourcePeriods,
      targetWeekday: draft.targetWeekday,
      targetPeriods,
      mode,
      startWeek,
      specificWeek,
      sourceSpecificWeek,
      createdAt: Date.now(),
    };
  }

  const updated = [...adjustments, newAdjustment];
  saveAdjustments(updated, schoolId, userId);
  return updated;
}

/**
 * 检查两个调课在源位置上的生效周次是否重叠
 */
function isSourceOverlap(adj: Adjustment, draft: AdjustmentDraft): boolean {
  const aStart = adj.mode === "once" ? (adj.sourceSpecificWeek ?? adj.specificWeek ?? adj.startWeek) : adj.startWeek;
  const aEnd = adj.mode === "once" ? aStart : Infinity;
  const bMode = draft.mode || "longterm";
  const bStart =
    bMode === "once"
      ? (draft.sourceSpecificWeek ?? draft.specificWeek ?? draft.startWeek ?? 1)
      : (draft.startWeek ?? 1);
  const bEnd = bMode === "once" ? bStart : Infinity;
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * 删除指定调课记录
 */
export function removeAdjustment(
  adjustments: Adjustment[],
  id: string,
  schoolId?: string | null,
  userId?: string | null
): Adjustment[] {
  const updated = adjustments.filter((adj) => adj.id !== id);
  saveAdjustments(updated, schoolId, userId);
  return updated;
}

/**
 * 清空当前账号下所有调课记录
 */
export function clearAdjustments(
  schoolId?: string | null,
  userId?: string | null
): void {
  saveAdjustments([], schoolId, userId);
}

/**
 * 检查调课是否对指定周次生效（目标侧）
 */
export function isAdjustmentActive(adj: Adjustment, weekNum: number): boolean {
  if (adj.mode === "once") {
    const targetWeek = adj.specificWeek ?? adj.startWeek;
    return weekNum === targetWeek;
  }
  return weekNum >= adj.startWeek;
}

/**
 * 检查调课在源位置上的生效周次
 */
function isSourceAdjustmentActive(adj: Adjustment, weekNum: number): boolean {
  if (adj.type === "cancel") {
    return isAdjustmentActive(adj, weekNum);
  }
  // move
  if (adj.mode === "once") {
    const sourceWeek = adj.sourceSpecificWeek ?? adj.specificWeek ?? adj.startWeek;
    return weekNum === sourceWeek;
  }
  return weekNum >= adj.startWeek;
}

/**
 * 查找某课程在当前周次生效的调课记录
 */
export function findActiveAdjustment(
  adjustments: Adjustment[],
  course: { weekday: Weekday; periods: number[] },
  weekNum: number
): Adjustment | undefined {
  return adjustments.find(
    (adj) =>
      isSourceAdjustmentActive(adj, weekNum) &&
      adj.sourceWeekday === course.weekday &&
      arraysEqual(adj.sourcePeriods, course.periods)
  );
}

/**
 * 获取指定日期应用调课后的课程列表
 */
export function getAdjustedItemsForDate(
  schedule: RawScheduleData,
  date: Date,
  adjustments: Adjustment[]
): { weekNum: number; items: DayItem[] } {
  const weekNum = getWeekNumber(date, schedule.meta.week1_monday);

  // 法定节假日：不显示课程，只显示节假日标记
  const holiday = getHolidayInfo(date);
  if (holiday?.type === "holiday") {
    return {
      weekNum,
      items: [{ kind: "holiday" as const, title: holiday.name + "放假" }],
    };
  }

  // 调休上班日：按国务院/学校默认映射显示「补周几」的课程
  const wday = holiday?.substituteWeekday ?? weekday1to7(date);

  const sourceActiveAdjs = adjustments.filter((adj) =>
    isSourceAdjustmentActive(adj, weekNum)
  );
  const targetActiveAdjs = adjustments.filter(
    (adj) => adj.type === "move" && isAdjustmentActive(adj, weekNum)
  );

  const items: DayItem[] = [];

  if (holiday?.type === "workday") {
    items.push({ kind: "holiday" as const, title: holiday.name });
  }

  for (const c of schedule.courses || []) {
    // Check if this course should exist this week
    const courseWeeks = parseWeekSpec(c.weeks);
    const courseActiveThisWeek = courseWeeks.length === 0 || courseWeeks.includes(weekNum);

    const sourceAdj = sourceActiveAdjs.find(
      (adj) =>
        adj.sourceWeekday === c.weekday && arraysEqual(adj.sourcePeriods, c.periods)
    );

    if (sourceAdj && courseActiveThisWeek) {
      if (sourceAdj.type === "cancel") {
        // 取消：原位置不显示此课程
        continue;
      }
      // 应用调课：当前周也处于目标生效范围，才在目标位置显示
      if (
        isAdjustmentActive(sourceAdj, weekNum) &&
        sourceAdj.targetWeekday === wday
      ) {
        items.push(buildCourseView(c, sourceAdj.targetPeriods!, schedule));
      }
      // 原位置不显示此课程
      continue;
    }

    if (c.weekday === wday && courseActiveThisWeek) {
      // 正常显示
      items.push(buildCourseView(c, c.periods, schedule));
    }
  }

  // 处理“跨周移动”：源周次不是本周，但目标周次是本周
  for (const adj of targetActiveAdjs) {
    const sourceHandledThisWeek = sourceActiveAdjs.some(
      (a) =>
        a.sourceWeekday === adj.sourceWeekday &&
        arraysEqual(a.sourcePeriods, adj.sourcePeriods)
    );
    if (sourceHandledThisWeek) continue;
    if (adj.targetWeekday !== wday) continue;
    const sourceCourse = findCourseBySource(
      schedule,
      adj.sourceWeekday,
      adj.sourcePeriods
    );
    if (!sourceCourse) continue;
    items.push(buildCourseView(sourceCourse, adj.targetPeriods!, schedule));
  }

  // Special items 不受调课影响
  for (const s of schedule.special || []) {
    const weeks = parseWeekSpec(s.weeks);
    if (weeks.length && !weeks.includes(weekNum)) continue;

    const wdays = Array.isArray(s.weekday) ? s.weekday : [s.weekday];
    if (!wdays.includes(wday)) continue;

    for (const t of s.times || []) {
      const timeText = [t.start, t.end].filter(Boolean).join("-");
      items.push({ kind: "special" as const, title: s.title, timeText, location: s.location });
    }
  }

  // 排序：节假日 > 特殊安排 > 课程
  items.sort((a, b) => {
    if (a.kind !== b.kind) {
      if (a.kind === "holiday") return -1;
      if (b.kind === "holiday") return 1;
      return a.kind === "special" ? -1 : 1;
    }
    if (a.kind === "special" && b.kind === "special")
      return a.timeText.localeCompare(b.timeText);
    const ap = (a as CourseView).periods?.[0] ?? 999;
    const bp = (b as CourseView).periods?.[0] ?? 999;
    return ap - bp;
  });

  return { weekNum, items };
}

function buildCourseView(
  c: RawCourse,
  periods: number[],
  schedule: RawScheduleData
): CourseView {
  const timeText = combinePeriodTime(schedule.periodTimes, periods);
  return {
    kind: "course" as const,
    title: c.title,
    weekday: c.weekday,
    periods,
    weeks: c.weeks,
    timeText,
    location: c.location,
    teacher: c.teacher,
  };
}

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

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
