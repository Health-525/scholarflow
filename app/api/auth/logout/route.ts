import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getRememberSetting, setRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

const logoutBodySchema = z.object({
  schoolId: z.string().min(1),
  userId: z.string().min(1),
});

/**
 * POST /api/auth/logout
 * 清除指定用户的凭证（不删除用户数据）
 * 下次登录同一账号时，数据仍然可用
 *
 * 登出时同时将 Remember_Password_Setting 置为关闭（Req 4.4），
 * 使 Auto_Refresh_Scheduler 停止后续静默刷新。加密密码本体由前端
 * 通过 Secure_Storage（clearCredential）清除；这里额外清理历史版本遗留的
 * SQLite 密码缓存键。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = logoutBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, userId } = parse.data;

    const db = getServerDB();
    const targetAccount = resolveAuthorizedAccount(request, db, { schoolId, userId });
    if (!targetAccount) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    db.deleteCredentials(targetAccount.schoolId, targetAccount.userId);
    db.deleteData(`credential-password:${targetAccount.schoolId}:${targetAccount.userId}`);

    // 关闭记住密码偏好（保留 lastManualLoginAt 仅作历史参考无安全影响）。
    const remember = getRememberSetting(targetAccount.schoolId, targetAccount.userId);
    setRememberSetting(targetAccount.schoolId, targetAccount.userId, { ...remember, enabled: false });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
