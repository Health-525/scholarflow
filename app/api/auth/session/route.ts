import { NextResponse } from "next/server";

import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/auth/session
 * 获取当前登录状态 — 直接从 credentials 表查询有效凭证
 */
export async function GET() {
  try {
    const db = getServerDB();
    const active = db.findActiveCredentials();

    if (active) {
      return NextResponse.json({
        authenticated: true,
        schoolId: active.schoolId,
        userId: active.userId,
        username: active.username,
      });
    }

    return NextResponse.json({ authenticated: false, schoolId: null });
  } catch {
    return NextResponse.json({ authenticated: false, schoolId: null });
  }
}
