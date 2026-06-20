import { NextResponse } from "next/server";
import { z } from "zod";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getRememberSetting, setRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

const rememberBodySchema = z.object({
  schoolId: z.string().min(1),
  userId: z.string().min(1),
});

/**
 * POST /api/auth/remember
 *
 * 将指定用户的 Remember_Password_Setting 置为关闭（Req 4.2）。
 * 由设置页「清除已记住的密码」控件调用：前端负责通过 Secure_Storage
 * 删除加密密码本体（clearCredential），此端点负责关闭服务端偏好开关，
 * 从而使 Auto_Refresh_Scheduler 停止后续静默刷新（Req 4.3）。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = rememberBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, userId } = parse.data;

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
