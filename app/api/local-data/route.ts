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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dashboard";

  const db = getServerDB();

  switch (type) {
    case "dashboard": {
      // Return dashboard summary — auto-generate if not exists
      let summary = db.readData("dashboard-summary");
      if (!summary) {
        const schedule = (db.readData("schedule") as { courses?: CourseEntry[] }) || { courses: [] };
        const assignments: AssignmentEntry[] = (db.readData("assignments") as AssignmentEntry[]) || [];
        const running: { records: RunningRecord[]; completed?: boolean } = (db.readData("running") as { records: RunningRecord[] }) || { records: [] };
        const grades = (db.readData("grades") as { gpa?: string }) || { gpa: "0.00" };
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
        // Cache the generated summary
        db.writeData("dashboard-summary", summary);
      }
      return NextResponse.json(summary);
    }

    case "schedule":
      return NextResponse.json(db.readData("schedule") || { courses: [] });

    case "assignments":
      return NextResponse.json(db.readData("assignments") || []);

    case "running":
      return NextResponse.json(db.readData("running") || { records: [] });

    case "health":
      return NextResponse.json(db.readData("health-status") || { agents: [] });

    case "roadmap":
      return NextResponse.json(db.readData("knowledge-roadmap") || { phases: [] });

    case "jwc-news":
      return NextResponse.json(db.readData("jwc-news") || []);

    case "exams":
      return NextResponse.json(db.readData("exams") || []);

    case "grades":
      return NextResponse.json(db.readData("grades") || { gpa: 0, allCourses: [] });

    case "library":
      return NextResponse.json(db.readData("library") || { libs: [], summary: { total: 0, used: 0, avail: 0, rate: 0 } });

    case "student": {
      const studentInfo = db.readData("student") as { studentId?: string; gpa?: string; totalCredits?: number; courseCount?: number } | null;
      if (studentInfo) {
        return NextResponse.json(studentInfo);
      }
      // Fallback: derive from grades data
      const grades = (db.readData("grades") as { gpa?: string; totalCredits?: number; allCourses?: unknown[] }) || { allCourses: [] };
      return NextResponse.json({
        studentId: "",
        gpa: grades.gpa || "0",
        totalCredits: grades.totalCredits || 0,
        courseCount: (grades.allCourses || []).length,
      });
    }

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
