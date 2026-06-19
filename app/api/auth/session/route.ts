
import { NextResponse } from "next/server";

import {
  DEFAULT_FORCE_RELOGIN_INTERVAL_MS,
  canSilentRelogin,
  isForceReloginDue,
} from "@/lib/auth/lifecycle";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getRememberSetting } from "@/lib/auto-refresh/state";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/auth/session
 * 获取当前登录状态。
 *
 * 判定逻辑（两层）：
 * 1. JWC cookie 未过期 → authenticated: true，正常使用。
 * 2. cookie 已过期但记住密码启用且未超 30 天强制重登 →
 *    authenticated: true，调度器可用记住的密码静默重登获取新 cookie。
 * 3. 以上皆不满足 → authenticated: false。
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const db = getServerDB();

    // 第一层：JWC cookie 仍在有效期内
    const active = db.findActiveCredentials();
    if (active) {
      const remember = getRememberSetting(active.schoolId, active.userId);
      return NextResponse.json({
        authenticated: true,
        schoolId: active.schoolId,
        userId: active.userId,
        username: active.username,
        lastManualLoginAt: remember.lastManualLoginAt,
        cookieExpiresAt: active.expiresAt,
        forceReloginDue: isForceReloginDue(
          { sessionValid: true, cookieExpiresAt: active.expiresAt,
            lastManualLoginAt: remember.lastManualLoginAt, rememberEnabled: remember.enabled },
          Date.now(),
          DEFAULT_FORCE_RELOGIN_INTERVAL_MS
        ),
      });
    }

    // 第二层：cookie 已过期，检查是否可以静默重登
    const recent = db.findMostRecentCredential();
    if (recent) {
      const remember = getRememberSetting(recent.schoolId, recent.userId);
      if (canSilentRelogin(
        { sessionValid: true, cookieExpiresAt: recent.expiresAt,
          lastManualLoginAt: remember.lastManualLoginAt, rememberEnabled: remember.enabled },
        Date.now(),
        DEFAULT_FORCE_RELOGIN_INTERVAL_MS
      )) {
        return NextResponse.json({
          authenticated: true,
          schoolId: recent.schoolId,
          userId: recent.userId,
          username: recent.username,
          lastManualLoginAt: remember.lastManualLoginAt,
          cookieExpiresAt: recent.expiresAt, // 已过期的时间戳
          forceReloginDue: false,
        });
      }
    }

    return NextResponse.json({ authenticated: false, schoolId: null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/auth/session] unexpected error:", (err as Error)?.message ?? err);
    return NextResponse.json({ authenticated: false, schoolId: null });
  }
}
