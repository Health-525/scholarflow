import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { getServerDB } from "@/lib/server-db";
import { escapeLike } from "@/lib/server-db/utils";

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
  // 仅对可能依赖课表初始化的数据类型触发，避免无关请求空转
  const seedableTypes = new Set(["dashboard", "schedule", "assignments", "exams", "grades", "student"]);
  if (seedableTypes.has(type)) {
    db.seedFromTimetable(prefix);
  }

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

    case "library":
      return NextResponse.json(db.readData(`library:${prefix}`) || { libs: [], summary: { total: 0, used: 0, avail: 0, rate: 0 } });

    case "adjustments":
      return NextResponse.json(db.readData(`adjustments:${prefix}`) || []);

    case "dailyReports": {
      const reportPrefix = `dailyReport:${prefix}:`;
      const dailyPattern = `dailyReport:${escapeLike(prefix)}:%`;
      const keys = db.listKeysLike(dailyPattern);
      const entries = keys
        .map((key) => {
          const date = key.slice(reportPrefix.length);
          return { name: `${date}.md`, path: `日报/${date}.md`, type: "file" as const };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
      return NextResponse.json(entries);
    }

    case "weeklyReports": {
      const reportPrefix = `weeklyReport:${prefix}:`;
      const weeklyPattern = `weeklyReport:${escapeLike(prefix)}:%`;
      const rows = db
        .getRawDB()
        .prepare(`SELECT key, content FROM data_store WHERE key LIKE ? ESCAPE '\\'`)
        .all(weeklyPattern) as { key: string; content: string }[];
      const entries = rows
        .map((row) => {
          const slug = row.key.slice(reportPrefix.length);
          let meta: { theme?: string; ai?: boolean; generatedAt?: number } = {};
          try {
            const parsed = JSON.parse(row.content) as unknown;
            if (parsed && typeof parsed === "object") {
              meta = parsed as { theme?: string; ai?: boolean; generatedAt?: number };
            }
          } catch {
            // keep meta empty for malformed content
          }
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
      // totalCredits 已改名为 requiredCredits（语义是「计入 GPA 的必修学分」）。
      // 已落盘的老记录仍是旧字段名，这里在读取边界统一归一化，不做数据迁移——
      // 老库继续可读，新写入只产出新字段名。
      type StoredStudent = {
        studentId?: string;
        gpa?: string;
        requiredCredits?: number;
        /** @deprecated 旧字段名，仅为读取兼容保留 */
        totalCredits?: number;
        courseCount?: number;
      };
      const studentInfo = db.readData(`student:${prefix}`) as StoredStudent | null;
      if (studentInfo) {
        return NextResponse.json({
          studentId: studentInfo.studentId ?? "",
          gpa: studentInfo.gpa ?? "0",
          requiredCredits: studentInfo.requiredCredits ?? studentInfo.totalCredits ?? 0,
          courseCount: studentInfo.courseCount ?? 0,
        });
      }
      const grades = (db.readData(`grades:${prefix}`) as {
        gpa?: string;
        requiredCredits?: number;
        /** @deprecated 旧字段名 */
        totalCredits?: number;
        allCourses?: unknown[];
      }) || { allCourses: [] };
      return NextResponse.json({
        studentId: "",
        gpa: grades.gpa || "0",
        requiredCredits: grades.requiredCredits ?? grades.totalCredits ?? 0,
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
