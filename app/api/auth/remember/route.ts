import { NextResponse } from "next/server";

import { getRememberSetting, setRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/remember
 *
 * 将指定用户的 Remember_Password_Setting 置为关闭（Req 4.2）。
 * 由设置页「清除已记住的密码」控件调用：前端负责通过 Secure_Storage
 * 删除加密密码本体（clearCredential），此端点负责关闭服务端偏好开关，
 * 从而使 Auto_Refresh_Scheduler 停止后续静默刷新（Req 4.3）。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; userId?: string };
    const { schoolId, userId } = body;

    if (!schoolId || !userId) {
      return NextResponse.json({ error: "missing schoolId or userId" }, { status: 400 });
    }

    // 验证当前登录用户身份：只允许操作自己的 remember 设置
    const db = getServerDB();
    const active = db.findActiveCredentials();
    if (!active || active.schoolId !== schoolId || active.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const remember = getRememberSetting(schoolId, userId);
    setRememberSetting(schoolId, userId, { ...remember, enabled: false });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/auth/remember] unexpected error:", (err as Error)?.message ?? err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
