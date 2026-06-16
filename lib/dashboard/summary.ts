import type { ServerDB } from "@/lib/server-db";

export interface DashboardSummary {
  updatedAt: string;
  date: string;
  overview: {
    courses: number;
    pendingAssignments: number;
    urgentAssignments: number;
    running: { total: number; morning: number; completed: boolean };
    gpa: string;
  };
  health: { agents: number; total: number; failing: number };
  knowledge: { gapsRemaining: number; estimatedHours: number };
}

interface CourseEntry {
  title: string;
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
  courses?: CourseEntry[];
}

interface GradesData {
  gpa?: string;
}

const RUNNING_GOAL = 50;

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

  return {
    updatedAt: new Date().toISOString(),
    date: today,
    overview: {
      courses: new Set(courses.map((c) => c.title)).size,
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
    health: { agents: 0, total: 0, failing: 0 },
    knowledge: { gapsRemaining: 0, estimatedHours: 0 },
  };
}

/**
 * 读取 dashboard summary 缓存，若不存在或日期非今日则重新生成。
 * 供 /api/local-data?type=dashboard 使用。
 */
export function getDashboardSummary(db: ServerDB, prefix: string): DashboardSummary {
  const cacheKey = `dashboard-summary:${prefix}`;
  const cached = db.readData(cacheKey) as DashboardSummary | null;
  const today = new Date().toISOString().slice(0, 10);

  if (cached && cached.date === today) {
    return cached;
  }

  const summary = buildDashboardSummary(db, prefix);
  db.writeData(cacheKey, summary);
  return summary;
}
