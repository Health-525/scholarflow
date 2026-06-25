import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { getServerDB } from "@/lib/server-db";

const localDataQuerySchema = z.object({
  type: z.string().default("dashboard"),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
  date: z.string().optional(),
  slug: z.string().optional(),
});

/**
 * GET /api/local-data?type=<type>&schoolId=<schoolId>&userId=<userId>
 *
 * 数据 key 格式: "<type>:<schoolId>:<userId>"
 * 实现账号隔离 — 不同账号的数据互不可见
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const parse = localDataQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parse.success) {
    return NextResponse.json({ error: "invalid query", issues: parse.error.issues }, { status: 400 });
  }
  const { type, schoolId: schoolIdParam, userId: userIdParam, date, slug } = parse.data;

  const db = getServerDB();
  const account = getAuthorizedAccount({ schoolId: schoolIdParam, userId: userIdParam }, db);

  if (!account) {
    return forbiddenResponse({ error: "unauthorized account access" });
  }

  const prefix = `${account.schoolId}:${account.userId}`;

  // Auto-seed missing data from timetable on first access
  db.seedFromTimetable(prefix);

  switch (type) {
    case "dashboard":
      return NextResponse.json(getDashboardSummary(db, prefix));

    case "schedule":
      return NextResponse.json(db.readData(`schedule:${prefix}`) || { courses: [] });

    case "assignments":
      return NextResponse.json(db.readData(`assignments:${prefix}`) || []);

    case "jwc-news":
      // 教务通知是全校共享的，按 schoolId 区分
      return NextResponse.json(db.readData(`jwc-news:${account.schoolId}`) || []);

    case "exams":
      return NextResponse.json(db.readData(`exams:${prefix}`) || []);

    case "grades":
      return NextResponse.json(db.readData(`grades:${prefix}`) || { gpa: 0, allCourses: [] });

    case "adjustments":
      return NextResponse.json(db.readData(`adjustments:${prefix}`) || []);

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
          const data = db.readData(key);
          const meta =
            data && typeof data === "object"
              ? (data as { theme?: string; ai?: boolean; generatedAt?: number })
              : {};
          return {
            name: `${slug}.md`,
            path: `周报/${slug}.md`,
            type: "file" as const,
            theme: meta.theme,
            ai: meta.ai,
            generatedAt: meta.generatedAt,
          };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
      return NextResponse.json(entries);
    }

    case "dailyReport": {
      if (!date) {
        return NextResponse.json({ error: "missing date" }, { status: 400 });
      }
      const data = db.readData(`dailyReport:${prefix}:${date}`);
      if (typeof data === "string") return NextResponse.json(data);
      if (data && typeof data === "object" && typeof (data as { content?: string }).content === "string") {
        return NextResponse.json((data as { content: string }).content);
      }
      return NextResponse.json("");
    }

    case "weeklyReport": {
      if (!slug) {
        return NextResponse.json({ error: "missing slug" }, { status: 400 });
      }
      const data = db.readData(`weeklyReport:${prefix}:${slug}`);
      if (typeof data === "string") {
        return NextResponse.json({ content: data });
      }
      if (data && typeof data === "object" && typeof (data as { content?: string }).content === "string") {
        const meta = data as { content: string; theme?: string; ai?: boolean; generatedAt?: number };
        return NextResponse.json({
          content: meta.content,
          theme: meta.theme,
          ai: meta.ai,
          generatedAt: meta.generatedAt,
        });
      }
      return NextResponse.json({ content: "" });
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
      const creds = db.getCredentials(account.schoolId, account.userId);
      return NextResponse.json(creds || {});
    }

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
