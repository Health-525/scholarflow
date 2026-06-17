import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/account-prefix";
import { setRememberSetting } from "@/lib/auto-refresh/state";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/login
 * 学校登录验证 → 保存教务凭证 → 记录「记住密码」偏好与本次手动登录时间 → 返回 session 信息
 *
 * 注意:本路由不写入明文密码。当处于 Electron 且用户勾选「记住密码」时,
 * 密码的 OS 级加密存储由前端调用 safeStorage(storeCredential)完成(见任务 12.1)。
 * 本路由仅负责:验证登录、保存教务会话凭证、记录 remember 偏好与登录时间。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      schoolId?: string;
      credentials?: Record<string, string>;
      remember?: boolean;
    };

    const { schoolId, credentials, remember } = body;

    if (!schoolId || !credentials) {
      return NextResponse.json({ error: "missing schoolId or credentials" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    // 登录验证
    const session = await adapter.login(credentials);

    // 保存教务凭证到 SQLite(不含明文密码)
    const db = getServerDB();
    const userId = resolveUserId(credentials.username);
    db.saveCredentials(schoolId, userId, session.data, session.expiresAt);

    // 记录「记住密码」偏好与本次手动登录时间。
    // remember===true 时启用记住密码;否则关闭。lastManualLoginAt 始终更新为本次登录时间。
    setRememberSetting(schoolId, userId, {
      enabled: !!remember,
      lastManualLoginAt: Date.now(),
    });

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
