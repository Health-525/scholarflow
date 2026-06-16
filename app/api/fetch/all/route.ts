import { NextResponse } from "next/server";

import { buildDashboardSummary } from "@/lib/dashboard/summary";
import { NJTECH_PERIOD_TIMES } from "@/lib/schools/njtech/jwgl";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

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
    const { schoolId, username } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "missing schoolId" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    // 从数据库读取已保存的凭证（login 时保存的 cookie）
    const db = getServerDB();
    const userId = username || "default";
    const savedCreds = db.getCredentials(schoolId, userId);

    if (!savedCreds) {
      return NextResponse.json({ error: "凭证已过期或不存在，请重新登录" }, { status: 401 });
    }

    const credentials = {
      schoolId,
      data: savedCreds,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    const results: Record<string, string> = {};

    // 数据 key 前缀 — 实现账号隔离
    const prefix = `${schoolId}:${userId}`;

    // 课表 — 加上 meta 字段（前端需要 week1_monday 和 tz）
    try {
      const courses = await adapter.fetchSchedule(credentials);

      // 从学校适配器获取学期配置
      const semesterInfo = adapter.getCurrentSemester?.() || {
        year: "2025", semester: "2", week1Monday: "2026-03-02",
      };

      db.writeData(`schedule:${prefix}`, {
        courses,
        meta: {
          week1_monday: semesterInfo.week1Monday,
          tz: "Asia/Shanghai",
          semester: `${semesterInfo.year}-${semesterInfo.year + 1}-${semesterInfo.semester}`,
          schoolId,
        },
        periodTimes: NJTECH_PERIOD_TIMES,
      });
      results.schedule = `${courses.length} 门课程`;
    } catch (e) {
      results.schedule = `失败: ${(e as Error).message}`;
    }

    // 考试
    try {
      const exams = await adapter.fetchExams(credentials);
      db.writeData(`exams:${prefix}`, exams);
      results.exams = `${exams.length} 门考试`;
    } catch (e) {
      results.exams = `失败: ${(e as Error).message}`;
    }

    // 成绩
    try {
      const grades = await adapter.fetchGrades(credentials);
      db.writeData(`grades:${prefix}`, grades);
      db.writeData(`student:${prefix}`, {
        studentId: username || savedCreds.username || "",
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
        const existing = (db.readData(`jwc-news:${schoolId}`) as import("@/lib/schools/types").NewsItem[]) || [];
        const news = await adapter.fetchJwcNews(existing);
        db.writeData(`jwc-news:${schoolId}`, news);
        results.jwcNews = `${news.length} 条通知`;
      } catch (e) {
        results.jwcNews = `失败: ${(e as Error).message}`;
      }
    }

    // 重新生成 dashboard summary — 使用实际数据而非硬编码
    db.writeData(`dashboard-summary:${prefix}`, buildDashboardSummary(db, prefix));

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
