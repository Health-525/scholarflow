import type { DayItem } from "@/lib/schedule/schedule";

/**
 * 课程块 — 渲染用视图：一节课在网格中的位置和原始数据。
 * 供 WeekGrid、MobileSchedule 等课表渲染组件共享。
 */
export interface CourseBlock {
  item: DayItem;
  firstPeriod: number;
  span: number;
}
