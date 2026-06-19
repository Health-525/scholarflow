/**
 * 中国法定节假日判断（封装 @kang8/chinese-holidays）。
 * 仅识别国务院公布的「放假」与「调休上班」日期，不把周末直接当假期，
 * 因为高校周末也可能有课。
 */

import { holiday } from "@kang8/chinese-holidays";

import type { Weekday } from "./schedule";

const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "日",
};

/**
 * 2026 年国务院调休上班日对应的「补周几的课」。
 * 来源：国务院办公厅《关于 2026 年部分节假日安排的通知》及各高校调课通知。
 * 不同学校可能略有差异，这里提供常见默认映射。
 */
const SUBSTITUTE_WEEKDAYS_2026: Record<string, Weekday> = {
  "2026-01-04": 5, // 元旦调休上班，补 1 月 2 日（周五）的课
  "2026-02-14": 5, // 春节调休上班，补 2 月 20 日（周五）的课
  "2026-02-28": 1, // 春节调休上班，补 2 月 23 日（周一）的课
  "2026-05-09": 2, // 劳动节调休上班，补 5 月 5 日（周二）的课
  "2026-09-20": 2, // 国庆节调休上班，补 10 月 6 日（周二）的课
  "2026-10-10": 3, // 国庆节调休上班，补 10 月 7 日（周三）的课
  // TODO: 2027 年及以后的调休上班日映射，待国务院通知公布后补充，
  // 或迁移到 schedule.json / 数据库配置中支持按年更新。
};

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface HolidayInfo {
  /** 节假日名称，如 "端午节" */
  name: string;
  /** 当天类型：holiday=放假无课，workday=调休上班 */
  type: "holiday" | "workday";
  /** 调休上班日应补的周几（1=周一 … 7=周日） */
  substituteWeekday?: Weekday;
}

/**
 * 获取调休上班日应补的周几。
 * 如果不在已知映射中，返回 undefined，按实际日期所在星期上课。
 */
export function getSubstituteWeekday(date: Date): Weekday | undefined {
  return SUBSTITUTE_WEEKDAYS_2026[formatLocalDate(date)];
}

/**
 * 获取指定日期的节假日信息。
 * 返回 null 表示非法定节假日/调休，按普通日期处理。
 */
export function getHolidayInfo(date: Date): HolidayInfo | null {
  try {
    if (holiday.isPublicHoliday(date)) {
      const name = holiday.publicHolidayName(date);
      if (name) {
        return { name, type: "holiday" };
      }
    }
    if (holiday.isPublicWorkday(date)) {
      const substituteWeekday = getSubstituteWeekday(date);
      const suffix = substituteWeekday
        ? `（补周${WEEKDAY_NAMES[substituteWeekday]}课）`
        : "";
      return { name: `调休上班${suffix}`, type: "workday", substituteWeekday };
    }
  } catch {
    // 离线或数据异常时回退到普通日期
  }
  return null;
}
