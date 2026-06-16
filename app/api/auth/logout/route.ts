import { NextResponse } from "next/server";

import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/logout
 * 清除指定用户的凭证（不删除用户数据）
 * 下次登录同一账号时，数据仍然可用
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; userId?: string };
    const { schoolId, userId } = body;

    if (!schoolId || !userId) {
      return NextResponse.json({ error: "missing schoolId or userId" }, { status: 400 });
    }

    const db = getServerDB();
    db.deleteCredentials(schoolId, userId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
