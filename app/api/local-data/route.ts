import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 自动探测 timetable 目录
function findTimetableDir(): string | null {
  const envDir = process.env.TIMETABLE_DIR;
  if (envDir) try { if (fs.existsSync(path.join(envDir, "data", "schedule.json"))) return envDir; } catch {}

  const candidates = [
    path.join(process.cwd(), "..", "timetable"),
    path.join(process.cwd(), "..", "..", "timetable"),
    path.join(process.cwd(), "..", "..", "..", "timetable"),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "data", "schedule.json"))) return c; } catch {}
  }
  return null; // Not found — return empty data instead of crashing
}

const TIMETABLE_DIR = findTimetableDir();

function safeRead(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {}
  return null;
}

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

  if (!TIMETABLE_DIR) {
    // No timetable dir — return empty data
    return NextResponse.json(type === "library" ? { libs: [], summary: { total: 0, used: 0, avail: 0, rate: 0 } } : type === "dashboard" ? { updatedAt: new Date().toISOString(), overview: {} } : {});
  }

  const dataDir = path.join(TIMETABLE_DIR, "data");
  const outDir = path.join(TIMETABLE_DIR, "_out");

  switch (type) {
    case "dashboard": {
      // Return dashboard summary — auto-generate if not exists
      let summary = safeRead(path.join(outDir, "dashboard-summary.json"));
      if (!summary) {
        const schedule = safeRead(path.join(dataDir, "schedule.json")) || { courses: [] };
        const assignments: AssignmentEntry[] = safeRead(path.join(dataDir, "assignments.json")) || [];
        const running: { records: RunningRecord[]; completed?: boolean } = safeRead(path.join(dataDir, "running.json")) || { records: [] };
        const grades = safeRead(path.join(outDir, "jwgl_grades_all.json")) || { gpa: "0.00" };
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
      }
      return NextResponse.json(summary);
    }

    case "schedule":
      return NextResponse.json(safeRead(path.join(dataDir, "schedule.json")) || { courses: [] });

    case "assignments":
      return NextResponse.json(safeRead(path.join(dataDir, "assignments.json")) || []);

    case "running":
      return NextResponse.json(safeRead(path.join(dataDir, "running.json")) || { records: [] });

    case "health":
      return NextResponse.json(safeRead(path.join(outDir, "health-status.json")) || { agents: [] });

    case "roadmap":
      return NextResponse.json(safeRead(path.join(outDir, "knowledge-roadmap.json")) || { phases: [] });

    case "jwc-news":
      return NextResponse.json(safeRead(path.join(outDir, "jwc_news.json")) || []);

    case "exams":
      return NextResponse.json(safeRead(path.join(outDir, "jwgl_exams.json")) || []);

    case "grades":
      return NextResponse.json(safeRead(path.join(outDir, "jwgl_grades_all.json")) || { gpa: 0, allCourses: [] });

    case "library":
      return NextResponse.json(safeRead(path.join(dataDir, "library.json")) || { libs: [], summary: { total: 0, used: 0, avail: 0, rate: 0 } });

    case "student": {
      let studentId = "";
      try {
        const envPath = path.join(TIMETABLE_DIR, ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const match = envContent.match(/JWGL_USERNAME=(.+)/);
          if (match) studentId = match[1].trim();
        }
      } catch {}
      const grades = safeRead(path.join(outDir, "jwgl_grades_all.json")) || { allCourses: [] };
      return NextResponse.json({ studentId, gpa: grades.gpa || "0", totalCredits: grades.totalCredits || 0, courseCount: (grades.allCourses || []).length });
    }

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
