import { NextResponse } from "next/server";

import { resolveUserId, resolveAccountPrefix, buildDataKey } from "@/lib/account-prefix";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; cookie?: string; username?: string };
    const { schoolId, cookie, username } = body;

    if (!schoolId || !cookie) {
      return NextResponse.json({ error: "missing schoolId or cookie" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const credentials = { schoolId, data: { cookie }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const exams = await adapter.fetchExams(credentials);

    const db = getServerDB();
    const userId = resolveUserId(username);
    // username 缺失时用 active 凭证兜底,保证与 local-data 读取端落同一 key
    const prefix = username
      ? `${schoolId}:${userId}`
      : resolveAccountPrefix({ schoolId, userId: undefined }, db.findActiveCredentials());
    db.writeData(buildDataKey("exams", prefix), exams);

    return NextResponse.json({ ok: true, count: exams.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
