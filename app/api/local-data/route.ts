import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

interface CourseEntry {
  title: string;
  [key: string]: unknown;
}

interface AssignmentEntry {
  done?: boolean;
  deadline?: string;
  [key: string]: unknown;
}

interface RunningRecord {
  type?: string;
  [key: string]: unknown;
}

/**
 * GET /api/local-data?type=<type>&schoolId=<schoolId>&userId=<userId>
 *
 * 数据 key 格式: "<type>:<schoolId>:<userId>"
 * 实现账号隔离 — 不同账号的数据互不可见
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dashboard";
  const schoolId = searchParams.get("schoolId") || "njtech";
  const userId = searchParams.get("userId") || "default";

  const db = getServerDB();
  const prefix = `${schoolId}:${userId}`;

  switch (type) {
    case "dashboard": {
      let summary = db.readData(`dashboard-summary:${prefix}`);
      if (!summary) {
        const schedule = (db.readData(`schedule:${prefix}`) as { courses?: CourseEntry[] }) || { courses: [] };
        const assignments: AssignmentEntry[] = (db.readData(`assignments:${prefix}`) as AssignmentEntry[]) || [];
        const running: { records: RunningRecord[]; completed?: boolean } = (db.readData(`running:${prefix}`) as { records: RunningRecord[] }) || { records: [] };
        const grades = (db.readData(`grades:${prefix}`) as { gpa?: string }) || { gpa: "0.00" };
        const today = new Date().toISOString().slice(0, 10);
        const courses: CourseEntry[] = schedule.courses || [];
        summary = {
          updatedAt: new Date().toISOString(),
          date: today,
          overview: {
            courses: new Set(courses.map(c => c.title)).size,
            pendingAssignments: assignments.filter(a => !a.done).length,
            urgentAssignments: assignments.filter(a => !a.done && a.deadline && a.deadline <= today).length,
            running: {
              total: Array.isArray(running.records) ? running.records.length : 0,
              morning: Array.isArray(running.records) ? running.records.filter(r => r.type === "morning").length : 0,
              completed: running.completed === true,
            },
            gpa: grades.gpa || "0.00",
          },
          health: { agents: 0, total: 0, failing: 0 },
          knowledge: { gapsRemaining: 0, estimatedHours: 0 },
        };
        db.writeData(`dashboard-summary:${prefix}`, summary);
      }
      return NextResponse.json(summary);
    }

    case "schedule":
      return NextResponse.json(db.readData(`schedule:${prefix}`) || { courses: [] });

    case "assignments":
      return NextResponse.json(db.readData(`assignments:${prefix}`) || []);

    case "running":
      return NextResponse.json(db.readData(`running:${prefix}`) || { records: [] });

    case "health":
      return NextResponse.json(db.readData("health-status") || { agents: [] });

    case "roadmap":
      return NextResponse.json(db.readData(`knowledge-roadmap:${prefix}`) || { phases: [] });

    case "jwc-news":
      // 教务通知是全校共享的，按 schoolId 区分
      return NextResponse.json(db.readData(`jwc-news:${schoolId}`) || []);

    case "exams":
      return NextResponse.json(db.readData(`exams:${prefix}`) || []);

    case "grades":
      return NextResponse.json(db.readData(`grades:${prefix}`) || { gpa: 0, allCourses: [] });

    case "library":
      return NextResponse.json(db.readData(`library:${prefix}`) || { libs: [], summary: { total: 0, used: 0, avail: 0, rate: 0 } });

    case "student": {
      const studentInfo = db.readData(`student:${prefix}`) as { studentId?: string; gpa?: string; totalCredits?: number; courseCount?: number } | null;
      if (studentInfo) {
        return NextResponse.json(studentInfo);
      }
      const grades = (db.readData(`grades:${prefix}`) as { gpa?: string; totalCredits?: number; allCourses?: unknown[] }) || { allCourses: [] };
      return NextResponse.json({
        studentId: "",
        gpa: grades.gpa || "0",
        totalCredits: grades.totalCredits || 0,
        courseCount: (grades.allCourses || []).length,
      });
    }

    case "credentials": {
      const creds = db.getCredentials(schoolId, userId);
      return NextResponse.json(creds || {});
    }

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
