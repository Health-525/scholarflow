import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";
import { getAdapter } from "@/lib/schools/registry";
import { NJTECH_PERIOD_TIMES } from "@/lib/schools/njtech/jwgl";

/**
 * POST /api/fetch/schedule
 * 从教务系统抓取课表 → 写入 SQLite（带账号隔离）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; username?: string };
    const { schoolId, username } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "missing schoolId" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

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

    const courses = await adapter.fetchSchedule(credentials);
    const prefix = `${schoolId}:${userId}`;
    const week1Monday = "2026-03-02";

    db.writeData(`schedule:${prefix}`, {
      courses,
      meta: {
        week1_monday: week1Monday,
        tz: "Asia/Shanghai",
        semester: "2025-2026-2",
        schoolId,
      },
      periodTimes: NJTECH_PERIOD_TIMES,
    });

    return NextResponse.json({ ok: true, count: courses.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
