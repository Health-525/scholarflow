import { NextResponse } from "next/server";

import { getAIConfig } from "@/lib/ai-config";
import {
  isAssignmentCompletedOn,
  isAssignmentOverdue,
} from "@/lib/assignment-utils";
import { getAuthorizedAccount, getAuthorizedSchoolId } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { logger } from "@/lib/logger";
import type { ReportCourseItem } from "@/lib/reports/types";
import { buildWeeklyReportMarkdown, generateWeeklyTheme, getCurrentWeekRange } from "@/lib/reports/weekly";
import { extractWeeklyTheme, generateWeeklyReportWithAI } from "@/lib/reports/weekly-ai";
import { getAdjustedItemsForDate, type Adjustment } from "@/lib/schedule/adjustments";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import {
  formatDateInTimeZone,
  getNowInTimeZone,
} from "@/lib/schedule/timezone";
import { getServerDB } from "@/lib/server-db";
import type { Assignment } from "@/types";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * POST /api/reports/weekly/generate?schoolId=...&userId=...
 *
 * 根据当前登录账号的本周日报、作业、课表数据生成周报。
 * - 默认优先使用 DeepSeek AI 生成（需先在设置中配置 API Key）。
 * - 未配置 Key 或 AI 调用失败时自动降级为本地模板。
 * - body 中可传 { slug: "YYYY-MM-DD_YYYY-MM-DD" } 以重新生成指定周。
 * 生成结果写入 `weeklyReport:<prefix>:<slug>`。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const db = getServerDB();
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get("schoolId") || undefined;
    const userIdParam = searchParams.get("userId") || undefined;

    const account = getAuthorizedAccount({ schoolId: schoolIdParam, userId: userIdParam }, db);
    const schoolId = getAuthorizedSchoolId(schoolIdParam, db);

    if (!account || !schoolId) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }

    const prefix = `${account.schoolId}:${account.userId}`;

    // 读取课表以确定时区
    const schedule = db.readData(`schedule:${prefix}`) as RawScheduleData | null;
    const tz = schedule?.meta?.tz || "Asia/Shanghai";

    const body = (await request.json().catch(() => ({}))) as { slug?: string };

    const dailyReports: { date: string; content: string }[] = [];
    const dayCourses: Record<string, ReportCourseItem[]> = {};

    // 如果 body 中传入了 slug（例如重新生成某一周），则按该 slug 解析周范围
    let { start, end, slug } = getCurrentWeekRange(getNowInTimeZone(tz));
    if (body.slug) {
      const parts = body.slug.split("_");
      if (parts.length === 2) {
        start = parts[0];
        end = parts[1];
        slug = body.slug;
      }
    }

    // 汇总本周日报
    const cur = parseLocalDate(start);
    const weekEnd = parseLocalDate(end);
    while (cur <= weekEnd) {
      const date = formatDateInTimeZone(cur, tz);
      const content = db.readData(`dailyReport:${prefix}:${date}`);
      if (typeof content === "string" && content.trim()) {
        dailyReports.push({ date, content });
      }
      cur.setDate(cur.getDate() + 1);
    }

    // 读取作业：周报只关注本周内截止、本周内完成、以及截至本周日仍未完成的逾期作业
    const assignmentsRaw = db.readData(`assignments:${prefix}`);
    const allAssignments = Array.isArray(assignmentsRaw) ? (assignmentsRaw as Assignment[]) : [];
    const weekDates: string[] = [];
    const weekCur = parseLocalDate(start);
    const weekEndDate = parseLocalDate(end);
    while (weekCur <= weekEndDate) {
      weekDates.push(formatDateInTimeZone(weekCur, tz));
      weekCur.setDate(weekCur.getDate() + 1);
    }
    const assignments = allAssignments.filter((a) => {
      const dueDate = a.deadline.slice(0, 10);
      const inWeek = dueDate >= start && dueDate <= end;
      const completedInWeek = weekDates.some((d) => isAssignmentCompletedOn(a, d));
      return inWeek || completedInWeek || isAssignmentOverdue(a, end);
    });

    // 计算本周每日实际生效的课程（已应用调课、周次过滤）
    const adjustments = (db.readData(`adjustments:${prefix}`) || []) as Adjustment[];
    if (schedule) {
      for (const date of weekDates) {
        const { items } = getAdjustedItemsForDate(schedule, parseLocalDate(date), adjustments);
        dayCourses[date] = items
          .filter((item) => item.kind === "course")
          .map((item) => ({
            title: item.title,
            weekday: item.weekday,
            periods: item.periods,
            location: item.location,
            teacher: item.teacher,
            timeText: item.timeText,
          }));
      }
    }

    // 优先尝试 AI 生成；未配置 Key 或 AI 失败时自动降级到本地模板
    let markdown: string;
    let usedAI = false;
    const aiConfig = getAIConfig(db, prefix);
    if (aiConfig.apiKey) {
      try {
        markdown = await generateWeeklyReportWithAI(aiConfig.apiKey, aiConfig.model, {
          weekStart: start,
          weekEnd: end,
          dailyReports,
          assignments,
          dayCourses,
        });
        usedAI = true;
      } catch (err) {
        logger.warn("[/api/reports/weekly/generate] AI failed, falling back to template:", (err as Error)?.message ?? err);
        markdown = buildWeeklyReportMarkdown({
          weekStart: start,
          weekEnd: end,
          dailyReports,
          assignments,
          dayCourses,
        });
      }
    } else {
      markdown = buildWeeklyReportMarkdown({
        weekStart: start,
        weekEnd: end,
        dailyReports,
        assignments,
        dayCourses,
      });
    }

    const theme = usedAI
      ? (extractWeeklyTheme(markdown) ?? generateWeeklyTheme({ weekStart: start, weekEnd: end, dailyReports, assignments, dayCourses }))
      : generateWeeklyTheme({ weekStart: start, weekEnd: end, dailyReports, assignments, dayCourses });

    db.writeData(`weeklyReport:${prefix}:${slug}`, { content: markdown, theme, generatedAt: Date.now(), ai: usedAI });

    return NextResponse.json({ ok: true, slug, start, end, theme, ai: usedAI });
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error("[/api/reports/weekly/generate] error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "failed to generate weekly report" }, { status: 500 });
  }
}
