import { NextResponse } from "next/server";

import { queryDaySummary } from "@/lib/activity/db";
import { getAIConfig } from "@/lib/ai-config";
import {
  isAssignmentCompletedOn,
  isAssignmentDueOn,
  isAssignmentOverdue,
} from "@/lib/assignment-utils";
import { getAuthorizedAccount, getAuthorizedSchoolId } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import type { GoalsState } from "@/lib/goals-api";
import { logger } from "@/lib/logger";
import { buildDailyReportMarkdown } from "@/lib/reports/daily";
import { generateDailyReportWithAI } from "@/lib/reports/daily-ai";
import type {
  JwcNewsItem,
  PomodoroSummary,
  ReportCourseItem,
  ReportDayItem,
  ReportExamItem,
  ReportGoalItem,
  ScreenTimeSummary,
} from "@/lib/reports/types";
import { getAdjustedItemsForDate, type Adjustment } from "@/lib/schedule/adjustments";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import {
  formatDateInTimeZone,
  getNowInTimeZone,
} from "@/lib/schedule/timezone";
import { getServerDB } from "@/lib/server-db";
import type { Assignment } from "@/types";
import type { Exam } from "@/types/exam";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readExistingDaily(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof (raw as { content?: unknown }).content === "string") {
    return (raw as { content: string }).content;
  }
  return undefined;
}

function isValidAssignment(a: unknown): a is Assignment {
  const item = a as Partial<Assignment>;
  return typeof item?.id === "string" && typeof item?.title === "string" && typeof item?.deadline === "string";
}

function getScheduleItemsForDate(
  schedule: RawScheduleData | null,
  dateStr: string,
  adjustments: Adjustment[]
): { courses: ReportCourseItem[]; dayItems: ReportDayItem[] } {
  const courses: ReportCourseItem[] = [];
  const dayItems: ReportDayItem[] = [];
  if (!schedule) return { courses, dayItems };
  const { items } = getAdjustedItemsForDate(schedule, parseLocalDate(dateStr), adjustments);
  for (const item of items) {
    if (item.kind === "course") {
      courses.push({
        title: item.title,
        weekday: item.weekday,
        periods: item.periods,
        location: item.location,
        teacher: item.teacher,
        timeText: item.timeText,
      });
    } else {
      dayItems.push({
        kind: item.kind,
        title: item.title,
        timeText: item.timeText,
        location: item.location,
      });
    }
  }
  return { courses, dayItems };
}

function computeScreenTimeFromDb(date: string, nowMs: number): ScreenTimeSummary | null {
  const summary = queryDaySummary(date, nowMs);
  if (summary.totalMinutes < 1) return null;

  return {
    totalActiveMinutes: summary.totalMinutes,
    categoryBreakdown: summary.categoryBreakdown,
    topApps: summary.appBreakdown
      .map((b) => ({ app: b.app, minutes: b.minutes }))
      .slice(0, 5),
  };
}

interface PomodoroSession {
  startedAt: number;
  duration: number;
  phase: string;
}

function isValidPomodoroSession(s: unknown): s is PomodoroSession {
  const item = s as Partial<PomodoroSession>;
  return typeof item?.startedAt === "number" && typeof item?.duration === "number" && typeof item?.phase === "string";
}

function getLocalDayBounds(dateStr: string): { start: number; end: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
  return { start, end };
}

function computePomodoro(sessionsRaw: unknown, date: string): PomodoroSummary | null {
  const sessions = Array.isArray(sessionsRaw) ? (sessionsRaw as unknown[]).filter(isValidPomodoroSession) : [];
  if (sessions.length === 0) return null;

  const { start, end } = getLocalDayBounds(date);
  const daySessions = sessions.filter((s) => s.startedAt >= start && s.startedAt < end && s.phase === "focus");
  const todayFocusSeconds = daySessions.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const todaySessions = daySessions.length;

  if (todaySessions === 0 && sessions.every((s) => s.startedAt < start || s.startedAt >= end)) {
    // 当天没有专注记录，返回 null（不显示番茄钟板块）
    return null;
  }

  // 连续打卡：从 date 前一天往前数，只要有 focus 记录就算一天
  let streak = todaySessions > 0 ? 1 : 0;
  if (streak > 0) {
    const check = new Date(start);
    for (let i = 0; i < 365; i++) {
      check.setDate(check.getDate() - 1);
      const dayStart = new Date(check.getFullYear(), check.getMonth(), check.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const has = sessions.some((s) => s.startedAt >= dayStart && s.startedAt < dayEnd && s.phase === "focus");
      if (has) streak++;
      else break;
    }
  }

  return { todayFocusSeconds, todaySessions, streak };
}

/**
 * POST /api/reports/daily/generate?schoolId=...&userId=...
 *
 * 根据当前登录账号的某日课表、作业、考试、目标等数据生成日报。
 * - 默认优先使用 DeepSeek AI 生成（需先在设置中配置 API Key）。
 * - 未配置 Key 或 AI 调用失败时自动降级为本地模板。
 * 生成结果写入 `dailyReport:<prefix>:<date>`。
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

    const body = (await request.json().catch(() => ({}))) as {
      ai?: boolean;
      date?: string;
      activityLog?: unknown;
      pomodoroSessions?: unknown;
    };

    // 读取课表以确定时区
    const schedule = db.readData(`schedule:${prefix}`) as RawScheduleData | null;
    const tz = schedule?.meta?.tz || "Asia/Shanghai";

    const date = body.date || formatDateInTimeZone(getNowInTimeZone(tz), tz);
    const now = getNowInTimeZone(tz).getTime();

    const adjustments = (db.readData(`adjustments:${prefix}`) || []) as Adjustment[];

    // 作业：当天截止、当天完成、或截止日在当天之前仍未完成
    const assignmentsRaw = db.readData(`assignments:${prefix}`);
    const allAssignments = Array.isArray(assignmentsRaw)
      ? (assignmentsRaw as unknown[]).filter(isValidAssignment)
      : [];
    const assignments = allAssignments.filter(
      (a) =>
        isAssignmentDueOn(a, date) ||
        isAssignmentCompletedOn(a, date) ||
        isAssignmentOverdue(a, date)
    );

    // 今日与明日的课表、特殊安排/节假日
    const { courses, dayItems } = getScheduleItemsForDate(schedule, date, adjustments);
    const tomorrowDate = addDays(date, 1);
    const { courses: tomorrowCourses, dayItems: tomorrowDayItems } = getScheduleItemsForDate(
      schedule,
      tomorrowDate,
      adjustments
    );

    // 考试：当天 + 未来 7 天内的 upcoming 考试
    const examsRaw = db.readData(`exams:${prefix}`);
    const allExams = Array.isArray(examsRaw) ? (examsRaw as Exam[]) : [];
    const upcomingDeadline = addDays(date, 7);
    const exams: ReportExamItem[] = allExams
      .filter(
        (e) =>
          e.status !== "deleted" &&
          e.date >= date &&
          e.date <= upcomingDeadline
      )
      .map((e) => ({
        subject: e.subject,
        date: e.date,
        time: e.time,
        location: e.location,
        notes: e.notes,
        status: e.status,
      }));

    // 目标：只取当天的目标
    const goalsState = db.readData(`goals:state:${prefix}`) as GoalsState | null;
    const goals: ReportGoalItem[] =
      goalsState && goalsState.date === date ? goalsState.goals : [];
    const goalStreak = goalsState?.streak ?? 0;

    // 教务处公告：全校共享，按 schoolId 区分；取最近 5 条
    const jwcNews = ((db.readData(`jwc-news:${schoolId}`) || []) as JwcNewsItem[]).slice(0, 5);

    // 屏幕时间：服务端直接从 SQLite 读取；番茄钟仍由客户端上传
    const screenTime = computeScreenTimeFromDb(date, now);
    const pomodoro = computePomodoro(body.pomodoroSessions, date);

    const existingDaily = readExistingDaily(db.readData(`dailyReport:${prefix}:${date}`));

    // 优先尝试 AI 生成；未配置 Key 或 AI 失败时自动降级到本地模板
    let markdown: string;
    let usedAI = false;
    const aiConfig = getAIConfig(db, prefix);
    if (aiConfig.apiKey) {
      try {
        markdown = await generateDailyReportWithAI(aiConfig.apiKey, aiConfig.model, {
          date,
          now,
          courses,
          dayItems,
          tomorrowCourses,
          tomorrowDayItems,
          assignments,
          exams,
          goals,
          goalStreak,
          jwcNews,
          screenTime,
          pomodoro,
          existingDaily,
        });
        usedAI = true;
      } catch (err) {
        logger.warn("[/api/reports/daily/generate] AI failed, falling back to template:", (err as Error)?.message ?? err);
        markdown = buildDailyReportMarkdown({
          date,
          now,
          courses,
          dayItems,
          tomorrowCourses,
          tomorrowDayItems,
          assignments,
          exams,
          goals,
          goalStreak,
          jwcNews,
          screenTime,
          pomodoro,
          existingDaily,
        });
      }
    } else {
      markdown = buildDailyReportMarkdown({
        date,
        now,
        courses,
        dayItems,
        tomorrowCourses,
        tomorrowDayItems,
        assignments,
        exams,
        goals,
        goalStreak,
        jwcNews,
        screenTime,
        pomodoro,
        existingDaily,
      });
    }

    db.writeData(`dailyReport:${prefix}:${date}`, {
      content: markdown,
      generatedAt: Date.now(),
      ai: usedAI,
    });

    return NextResponse.json({ ok: true, date, ai: usedAI });
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error("[/api/reports/daily/generate] error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "failed to generate daily report" }, { status: 500 });
  }
}
