
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveUserId } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { setRememberSetting } from "@/lib/auto-refresh/state";
import { encryptPassword } from "@/lib/crypto-password";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

const loginBodySchema = z.object({
  schoolId: z.string().min(1),
  credentials: z.record(z.string(), z.string()),
  remember: z.boolean().optional(),
});

/**
 * POST /api/auth/login
 * 学校登录验证 → 保存教务凭证 → 记录「记住密码」偏好与本次手动登录时间 → 返回 session 信息
 *
 * 记住密码时，密码同时通过两条路径保存：
 * 1. Electron safeStorage（OS 级加密）→ 供主进程调度器使用
 * 2. 服务端 SQLite credential-password key → 供 Web 前端手动刷新时 /api/fetch/all 静默重登
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = loginBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, credentials, remember } = parse.data;

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

    // 记住密码时，将密码存入服务端 DB，供 /api/fetch/all 在 cookie 过期后静默重登。
    // 密码仅存在本地 SQLite 文件中，不会上传到任何远程服务器。
    const password = credentials.password;
    if (remember && password) {
      db.writeData(`credential-password:${schoolId}:${userId}`, { password: encryptPassword(password) });
    } else {
      db.deleteData(`credential-password:${schoolId}:${userId}`);
    }

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
