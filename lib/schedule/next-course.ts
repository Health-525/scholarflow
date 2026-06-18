import { getAdjustedItemsForDate } from "./adjustments";
import type { Adjustment } from "./adjustments";
import type { RawScheduleData, DayItem } from "./schedule";
import { getNowInTimeZone, parseTimeToDate } from "./timezone";

export interface NextCourseInfo {
  item: DayItem;
  startTime: Date;
  endTime: Date;
}

/**
 * 获取下一节课信息（考虑调课）
 */
export function getNextCourse(
  schedule: RawScheduleData,
  today: Date,
  tz: string,
  adjustments: Adjustment[] = []
): NextCourseInfo | null {
  const { items } = getAdjustedItemsForDate(schedule, today, adjustments);
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


