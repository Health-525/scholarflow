import { RUNNING_GOAL } from "@/lib/running-utils";
import { getItemsForDate } from "@/lib/schedule/schedule";
import { getNowInTimeZone } from "@/lib/schedule/timezone";
import type { ServerDB } from "@/lib/server-db";

export interface DashboardSummary {
  updatedAt: string;
  date: string;
  overview: {
    courses: number;
    todayCourses: number;
    pendingAssignments: number;
    urgentAssignments: number;
    running: { total: number; morning: number; completed: boolean };
    gpa: string;
  };
}

interface CourseEntry {
  title: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  periods: number[];
  weeks: string;
  location?: string;
}

interface AssignmentEntry {
  done?: boolean;
  deadline?: string;
}

interface RunningRecord {
  type?: string;
}

interface RunningData {
  records?: RunningRecord[];
  completed?: boolean;
}

interface ScheduleData {
  meta?: { week1_monday: string; tz?: string };
  courses?: CourseEntry[];
}

interface GradesData {
  gpa?: string;
}

/**
 * 根据当前 SQLite 中的数据重新生成 dashboard summary。
 * 不读写缓存，供 /api/fetch/all 等需要强制刷新的场景调用。
 */
export function buildDashboardSummary(db: ServerDB, prefix: string): DashboardSummary {
  const schedule = (db.readData(`schedule:${prefix}`) as ScheduleData | null) || { courses: [] };
  const assignments = (db.readData(`assignments:${prefix}`) as AssignmentEntry[] | null) || [];
  const runningData = (db.readData(`running:${prefix}`) as RunningData | null) || { records: [] };
  const grades = (db.readData(`grades:${prefix}`) as GradesData | null) || { gpa: "0.00" };
  const today = new Date().toISOString().slice(0, 10);

  const courses = schedule.courses || [];
  const records = Array.isArray(runningData.records) ? runningData.records : [];
  const runningTotal = records.length;

  // 计算今日课程数（按课表时区）
  let todayCourses = 0;
  if (schedule.meta?.week1_monday) {
    const tz = schedule.meta.tz || "Asia/Shanghai";
    const now = getNowInTimeZone(tz);
    const { items } = getItemsForDate(schedule as { meta: { week1_monday: string }; courses: CourseEntry[] }, now);
    todayCourses = items.length;
  }

  return {
    updatedAt: new Date().toISOString(),
    date: today,
    overview: {
      courses: new Set(courses.map((c) => c.title)).size,
      todayCourses,
      pendingAssignments: assignments.filter((a) => !a.done).length,
      urgentAssignments: assignments.filter(
        (a) => !a.done && a.deadline && a.deadline <= today
      ).length,
      running: {
        total: runningTotal,
        morning: records.filter((r) => r.type === "morning").length,
        completed: runningData.completed === true || runningTotal >= RUNNING_GOAL,
      },
      gpa: grades.gpa || "0.00",
    },
  };
}

/**
 * 每次请求都重新生成 dashboard summary，避免课表/成绩等数据变更后显示旧数字。
 * 供 /api/local-data?type=dashboard 使用。
 */
export function getDashboardSummary(db: ServerDB, prefix: string): DashboardSummary {
  return buildDashboardSummary(db, prefix);
}
