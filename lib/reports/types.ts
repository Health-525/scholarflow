/**
 * 日报/周报生成器共用的课程视图。
 *
 * 已从 RawScheduleData + Adjustment 解析为指定日期/周次下实际生效的课程。
 */
export interface ReportCourseItem {
  title: string;
  /** 1=周一, 7=周日 */
  weekday: number;
  periods: number[];
  location?: string;
  teacher?: string;
  timeText?: string;
}

/**
 * 日报生成器使用的特殊/节假日安排视图。
 */
export interface ReportDayItem {
  kind: "special" | "holiday";
  title: string;
  timeText?: string;
  location?: string;
}

/**
 * 日报生成器使用的考试视图。
 */
export interface ReportExamItem {
  subject: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  status: "upcoming" | "completed" | "deleted";
}

/**
 * 日报生成器使用的每日目标视图。
 */
export interface ReportGoalItem {
  text: string;
  done: boolean;
}

/**
 * 屏幕时间汇总视图。
 */
export interface ScreenTimeSummary {
  totalActiveMinutes: number;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  topApps: Array<{ app: string; minutes: number }>;
}

/**
 * 番茄钟统计视图。
 */
export interface PomodoroSummary {
  todayFocusSeconds: number;
  todaySessions: number;
  streak: number;
}

/**
 * 教务处公告视图。
 */
export interface JwcNewsItem {
  title: string;
  url: string;
  date: string;
  category?: string;
}
