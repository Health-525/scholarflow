import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/account-prefix";
import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { schoolUsernameBodySchema } from "@/lib/schemas/fetch";
import { getAdapter } from "@/lib/schools/registry";
import { currentTerm, resolveTerm } from "@/lib/schools/term-dates";
import { getServerDB } from "@/lib/server-db";

/**
 * 适配器未实现 getCurrentSemester 时的兜底：按当前月份推学期并估算开学日。
 * 原先是写死的 2025-2 / 2026-03-02，被时间超过后会持续产出错误周次。
 * 必须在请求时求值，不能提到模块级常量。
 */
function fallbackSemesterInfo() {
  return resolveTerm({}, currentTerm());
}

/**
 * POST /api/fetch/schedule
 * 从教务系统抓取课表 → 写入 SQLite（带账号隔离）
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const parse = schoolUsernameBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, username } = parse.data;

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const db = getServerDB();
    const targetAccount = getAuthorizedAccount({ schoolId, userId: username }, db);
    if (!targetAccount) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = resolveUserId(targetAccount.userId);
    const savedCreds = db.getCredentials(schoolId, userId);

    if (!savedCreds) {
      return NextResponse.json({ error: "凭证已过期或不存在，请重新登录" }, { status: 401 });
    }

    const credentials = {
      schoolId,
      data: savedCreds,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    const courses = await adapter.fetchSchedule(credentials);
    const prefix = `${schoolId}:${userId}`;
    const semInfo = adapter.getCurrentSemester?.() ?? fallbackSemesterInfo();
    const y = Number.parseInt(semInfo.year, 10);
    if (!courses.length) {
      return NextResponse.json({ error: "课表为空，已保留本地已有数据" }, { status: 502 });
    }
    if (!semInfo.week1Monday) {
      return NextResponse.json({ error: "缺少学期起始周配置，已保留本地已有数据" }, { status: 500 });
    }

    db.writeData(`schedule:${prefix}`, {
      courses,
      meta: {
        week1_monday: semInfo.week1Monday,
        tz: "Asia/Shanghai",
        semester: `${y}-${y + 1}-${semInfo.semester}`,
        schoolId,
      },
      periodTimes: adapter.periodTimes,
    });

    return NextResponse.json({ ok: true, count: courses.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
