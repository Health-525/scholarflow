import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/login
 * 学校登录验证 → 保存凭证 → 返回 session 信息
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      schoolId?: string;
      credentials?: Record<string, string>;
    };

    const { schoolId, credentials } = body;

    if (!schoolId || !credentials) {
      return NextResponse.json({ error: "missing schoolId or credentials" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    // 登录验证
    const session = await adapter.login(credentials);

    // 保存凭证到 SQLite
    const db = getServerDB();
    const userId = credentials.username || "default";
    db.saveCredentials(schoolId, userId, session.data, session.expiresAt);

    return NextResponse.json({
      ok: true,
      schoolId: session.schoolId,
      userId,
      expiresAt: session.expiresAt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
