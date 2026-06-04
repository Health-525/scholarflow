import { RawScheduleData, getItemsForDate, DayItem } from "./schedule";
import { getNowInTimeZone, parseTimeToDate } from "./timezone";

export interface NextCourseInfo {
  item: DayItem;
  startTime: Date;
  endTime: Date;
}

/**
 * 获取下一节课信息
 */
export function getNextCourse(
  schedule: RawScheduleData,
  today: Date,
  tz: string
): NextCourseInfo | null {
  const { items } = getItemsForDate(schedule, today);
  if (!items.length) return null;
  const now = getNowInTimeZone(tz);
  for (const item of items) {
    if (!item.timeText) continue;
    const [start, end] = item.timeText.split("-");
    if (!start || !end) continue;
    const startTime = parseTimeToDate(today, start.trim());
    const endTime = parseTimeToDate(today, end.trim());
    if (endTime > now) {
      return { item, startTime, endTime };
    }
  }
  return null;
}

/**
 * 检查今天的课是否全部结束
 */
export function isTodayFinished(
  schedule: RawScheduleData,
  today: Date,
  tz: string
): boolean {
  return getNextCourse(schedule, today, tz) === null;
}
