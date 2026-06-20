import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_SCHOOL_ID } from "@/lib/account-prefix";
import { resolveAccountPrefix, resolveSchoolId, resolveUserId } from "@/lib/account-prefix";
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
  const active = db.findActiveCredentials();
  let prefix = resolveAccountPrefix({ schoolId: schoolIdParam, userId: userIdParam }, active);
  const schoolId = resolveSchoolId({ schoolId: schoolIdParam }, active);

  // 凭证过期但本地已有数据时，回退到本地最近使用的账号，避免显示空 default。
  if (!active && !userIdParam) {
    const localPrefix = db.findLocalAccountPrefix(schoolIdParam || DEFAULT_SCHOOL_ID);
    if (localPrefix) {
      prefix = localPrefix;
    }
  }

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
      if (!date) {
        return NextResponse.json({ error: "missing date" }, { status: 400 });
      }
      const data = db.readData(`dailyReport:${prefix}:${date}`);
      return NextResponse.json(typeof data === "string" ? data : "");
    }

    case "weeklyReport": {
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
      // userId 单独解析:显式提供则用之，否则回退有效凭证的 userId，再否则默认
      const userId =
        userIdParam && userIdParam.trim()
          ? resolveUserId(userIdParam)
          : active?.userId ?? resolveUserId(userIdParam);
      const creds = db.getCredentials(schoolId, userId);
      return NextResponse.json(creds || {});
    }

    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
