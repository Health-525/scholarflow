import { NextResponse } from "next/server";

import { getRememberSetting, setRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/logout
 * 清除指定用户的凭证（不删除用户数据）
 * 下次登录同一账号时，数据仍然可用
 *
 * 登出时同时将 Remember_Password_Setting 置为关闭（Req 4.4），
 * 使 Auto_Refresh_Scheduler 停止后续静默刷新。加密密码本体由前端
 * 通过 Secure_Storage（clearCredential）清除。
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
    db.deleteData(`credential-password:${schoolId}:${userId}`);

    // 关闭记住密码偏好（保留 lastManualLoginAt 仅作历史参考无安全影响）。
    const remember = getRememberSetting(schoolId, userId);
    setRememberSetting(schoolId, userId, { ...remember, enabled: false });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
