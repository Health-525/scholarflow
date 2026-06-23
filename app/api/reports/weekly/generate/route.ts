import { NextResponse } from "next/server";

import { getAIConfig } from "@/lib/ai-config";
import { getAuthorizedAccount, getAuthorizedSchoolId } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { buildWeeklyReportMarkdown, getCurrentWeekRange } from "@/lib/reports/weekly";
import { generateWeeklyReportWithAI } from "@/lib/reports/weekly-ai";
import type { RawScheduleData } from "@/lib/schedule/schedule";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/reports/weekly/generate?schoolId=...&userId=...
 *
 * 根据当前登录账号的本周日报、作业、课表数据生成周报。
 * - 默认使用模板生成。
 * - body 中传 { ai: true } 时调用 DeepSeek AI 生成（需先在设置中配置 API Key）。
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
    const { start, end, slug } = getCurrentWeekRange();

    // 汇总本周日报
    const dailyReports: { date: string; content: string }[] = [];
    const cur = new Date(`${start}T00:00:00`);
    const weekEnd = new Date(`${end}T00:00:00`);
    while (cur <= weekEnd) {
      const date = cur.toISOString().slice(0, 10);
      const content = db.readData(`dailyReport:${prefix}:${date}`);
      if (typeof content === "string" && content.trim()) {
        dailyReports.push({ date, content });
      }
      cur.setDate(cur.getDate() + 1);
    }

    // 读取作业
    const assignmentsRaw = db.readData(`assignments:${prefix}`);
    const assignments = Array.isArray(assignmentsRaw) ? assignmentsRaw : [];

    // 读取课表(可选)
    const schedule = db.readData(`schedule:${prefix}`) as RawScheduleData | null;

    const body = (await request.json().catch(() => ({}))) as { ai?: boolean };

    let markdown: string;
    if (body.ai) {
      const aiConfig = getAIConfig(db, prefix);
      if (!aiConfig.apiKey) {
        return NextResponse.json(
          { error: "DeepSeek API Key 未配置，无法使用 AI 生成" },
          { status: 503 }
        );
      }
      markdown = await generateWeeklyReportWithAI(aiConfig.apiKey, aiConfig.model, {
        weekStart: start,
        weekEnd: end,
        dailyReports,
        assignments,
        schedule,
      });
    } else {
      markdown = buildWeeklyReportMarkdown({
        weekStart: start,
        weekEnd: end,
        dailyReports,
        assignments,
        schedule,
      });
    }

    db.writeData(`weeklyReport:${prefix}:${slug}`, markdown);

    return NextResponse.json({ ok: true, slug, start, end, ai: !!body.ai });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/reports/weekly/generate] error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "failed to generate weekly report" }, { status: 500 });
  }
}
