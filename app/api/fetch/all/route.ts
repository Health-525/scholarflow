import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";
import { getAdapter } from "@/lib/schools/registry";

/**
 * POST /api/fetch/all
 * 一次性抓取所有数据（课表、考试、成绩、通知）
 * 图书馆需要单独的 JWT，不在此处抓取
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      schoolId?: string;
      cookie?: string;
      username?: string;
    };
    const { schoolId, cookie, username } = body;

    if (!schoolId || !cookie) {
      return NextResponse.json({ error: "missing schoolId or cookie" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const credentials = {
      schoolId,
      data: { cookie, username: username || "" },
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    const db = getServerDB();
    const results: Record<string, string> = {};

    // 课表
    try {
      const courses = await adapter.fetchSchedule(credentials);
      db.writeData("schedule", { courses });
      results.schedule = `${courses.length} 门课程`;
    } catch (e) {
      results.schedule = `失败: ${(e as Error).message}`;
    }

    // 考试
    try {
      const exams = await adapter.fetchExams(credentials);
      db.writeData("exams", exams);
      results.exams = `${exams.length} 门考试`;
    } catch (e) {
      results.exams = `失败: ${(e as Error).message}`;
    }

    // 成绩
    try {
      const grades = await adapter.fetchGrades(credentials);
      db.writeData("grades", grades);
      db.writeData("student", {
        studentId: username || "",
        gpa: grades.gpa,
        totalCredits: grades.totalCredits,
        courseCount: grades.allCourses.length,
      });
      results.grades = `GPA ${grades.gpa}, ${grades.allCourses.length} 门`;
    } catch (e) {
      results.grades = `失败: ${(e as Error).message}`;
    }

    // 教务通知
    if (adapter.fetchJwcNews) {
      try {
        const existing = (db.readData("jwc-news") as import("@/lib/schools/types").NewsItem[]) || [];
        const news = await adapter.fetchJwcNews(existing);
        db.writeData("jwc-news", news);
        results.jwcNews = `${news.length} 条通知`;
      } catch (e) {
        results.jwcNews = `失败: ${(e as Error).message}`;
      }
    }

    // 重新生成 dashboard summary
    const schedule = (db.readData("schedule") as { courses?: unknown[] }) || { courses: [] };
    const assignments = db.readData("assignments") || [];
    const running = db.readData("running") || { records: [] };
    const gradesData = db.readData("grades") || { gpa: "0.00" };
    const today = new Date().toISOString().slice(0, 10);

    db.writeData("dashboard-summary", {
      updatedAt: new Date().toISOString(),
      date: today,
      overview: {
        courses: new Set((schedule.courses as { title: string }[]).map(c => c.title)).size,
        pendingAssignments: Array.isArray(assignments) ? (assignments as { done?: boolean }[]).filter(a => !a.done).length : 0,
        urgentAssignments: 0,
        running: { total: 0, morning: 0, completed: false },
        gpa: (gradesData as { gpa?: string }).gpa || "0.00",
      },
      health: { agents: 0, total: 0, failing: 0 },
      knowledge: { gapsRemaining: 0, estimatedHours: 0 },
    });

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
