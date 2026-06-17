import { NextResponse } from "next/server";

import {
  DEFAULT_FORCE_RELOGIN_INTERVAL_MS,
  isForceReloginDue,
} from "@/lib/auth/lifecycle";
import { getRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/auth/session
 * 获取当前登录状态 — 直接从 credentials 表查询有效凭证。
 *
 * 仅校验本地凭证标记,不触发任何抓取。authenticated 时额外返回凭证生命周期字段:
 * - `lastManualLoginAt`:上次手动登录时间戳(来自 RememberSetting)。
 * - `cookieExpiresAt`:JWC cookie 过期时间戳(来自 credentials 记录)。
 * - `forceReloginDue`:是否已超过强制重登间隔(由 lifecycle 纯函数计算)。
 */
export async function GET() {
  try {
    const db = getServerDB();
    const active = db.findActiveCredentials();

    if (active) {
      const remember = getRememberSetting(active.schoolId, active.userId);
      const lastManualLoginAt = remember.lastManualLoginAt;
      const cookieExpiresAt = active.expiresAt;
      const forceReloginDue = isForceReloginDue(
        {
          sessionValid: true,
          cookieExpiresAt,
          lastManualLoginAt,
          rememberEnabled: remember.enabled,
        },
        Date.now(),
        DEFAULT_FORCE_RELOGIN_INTERVAL_MS
      );

      return NextResponse.json({
        authenticated: true,
        schoolId: active.schoolId,
        userId: active.userId,
        username: active.username,
        lastManualLoginAt,
        cookieExpiresAt,
        forceReloginDue,
      });
    }

    return NextResponse.json({ authenticated: false, schoolId: null });
  } catch (err) {
    // DB 异常时记录日志，避免静默掩盖问题；仍返回未登录状态，不暴露错误细节给前端
    // eslint-disable-next-line no-console
    console.error("[/api/auth/session] unexpected error:", (err as Error)?.message ?? err);
    return NextResponse.json({ authenticated: false, schoolId: null });
  }
}
