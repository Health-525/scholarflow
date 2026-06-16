import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/dashboard/summary";
import { getServerDB } from "@/lib/server-db";

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

  // Auto-seed missing data from timetable on first access
  db.seedFromTimetable(prefix);

  switch (type) {
    case "dashboard":
      return NextResponse.json(getDashboardSummary(db, prefix));

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

    case "dailyReports": {
      const reportPrefix = `dailyReport:${prefix}:`;
      const entries = db
        .listKeys()
        .filter((key) => key.startsWith(reportPrefix))
        .map((key) => {
          const date = key.slice(reportPrefix.length);
          return { name: `${date}.md`, path: `日报/${date}.md`, type: "file" as const };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
      return NextResponse.json(entries);
    }

    case "weeklyReports": {
      const reportPrefix = `weeklyReport:${prefix}:`;
      const entries = db
        .listKeys()
        .filter((key) => key.startsWith(reportPrefix))
        .map((key) => {
          const slug = key.slice(reportPrefix.length);
          return { name: `${slug}.md`, path: `周报/${slug}.md`, type: "file" as const };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
      return NextResponse.json(entries);
    }

    case "dailyReport": {
      const date = searchParams.get("date");
      if (!date) {
        return NextResponse.json({ error: "missing date" }, { status: 400 });
      }
      const data = db.readData(`dailyReport:${prefix}:${date}`);
      return NextResponse.json(typeof data === "string" ? data : "");
    }

    case "weeklyReport": {
      const slug = searchParams.get("slug");
      if (!slug) {
        return NextResponse.json({ error: "missing slug" }, { status: 400 });
      }
      const data = db.readData(`weeklyReport:${prefix}:${slug}`);
      return NextResponse.json(typeof data === "string" ? data : "");
    }

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
