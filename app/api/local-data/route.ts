import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TIMETABLE_DIR = "D:\\A\\timetable";

function safeRead(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {}
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dashboard";

  const dataDir = path.join(TIMETABLE_DIR, "data");
  const outDir = path.join(TIMETABLE_DIR, "_out");

  switch (type) {
    case "dashboard": {
      // Return dashboard summary — auto-generate if not exists
      let summary = safeRead(path.join(outDir, "dashboard-summary.json"));
      if (!summary) {
        const schedule = safeRead(path.join(dataDir, "schedule.json")) || { courses: [] };
        const assignments = safeRead(path.join(dataDir, "assignments.json")) || [];
        const running = safeRead(path.join(dataDir, "running.json")) || { records: [] };
        const today = new Date().toISOString().slice(0, 10);
        summary = {
          updatedAt: new Date().toISOString(),
          date: today,
          overview: {
            courses: new Set((schedule.courses || []).map((c: any) => c.title)).size,
            pendingAssignments: (Array.isArray(assignments) ? assignments : []).filter((a: any) => !a.done).length,
            urgentAssignments: (Array.isArray(assignments) ? assignments : []).filter((a: any) => !a.done && a.deadline <= today).length,
            running: {
              total: Array.isArray(running.records) ? running.records.length : 0,
              morning: Array.isArray(running.records) ? running.records.filter((r: any) => r.type === "morning").length : 0,
              completed: running.completed === true,
            },
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

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
