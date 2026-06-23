
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveUserId } from "@/lib/account-prefix";
import { clearLoginRateLimit, getLoginRateLimit, recordLoginFailure } from "@/lib/auth/login-rate-limit";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { setRememberSetting } from "@/lib/auto-refresh/state";
import { deleteHebauMfaChallenge, HEBEAU_MFA_REQUIRED_PREFIX } from "@/lib/schools/hebau/mfa";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

const loginBodySchema = z.object({
  schoolId: z.string().min(1),
  credentials: z.record(z.string(), z.string()),
  remember: z.boolean().optional(),
});

function getLoginStage(credentials: Record<string, string>): "password" | "mfa" {
  return credentials.challengeId && credentials.dynamicCode ? "mfa" : "password";
}

function getRateLimitMessage(stage: "password" | "mfa"): string {
  return stage === "mfa" ? "验证码尝试过多，请稍后再试" : "登录尝试过多，请稍后再试";
}

function shouldCountFailure(stage: "password" | "mfa", message: string): boolean {
  if (/超时|网络|请求|发送验证码失败|暂不支持/.test(message)) return false;
  if (stage === "mfa") {
    if (/已过期|会话已失效/.test(message)) return false;
    return /验证码|动态码|校验失败|账号不匹配/.test(message);
  }
  return /密码|账号|认证/.test(message);
}

/**
 * POST /api/auth/login
 * 学校登录验证 → 保存教务凭证 → 记录「记住密码」偏好与本次手动登录时间 → 返回 session 信息
 *
 * 记住密码仅通过 Electron safeStorage（OS 级加密）保存，
 * 服务端 SQLite 不再落盘密码，避免本地数据库泄露后恢复明文密码。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  let schoolId = "";
  let credentials: Record<string, string> = {};


  try {
    const parse = loginBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    ({ schoolId, credentials } = parse.data);
    const { remember } = parse.data;
    const userId = resolveUserId(credentials.username);
    const stage = getLoginStage(credentials);
    const rateLimit = getLoginRateLimit(stage, schoolId, userId);
    if (rateLimit.limited) {
      if (stage === "mfa" && credentials.challengeId) {
        deleteHebauMfaChallenge(credentials.challengeId);
      }
      return NextResponse.json(
        { error: getRateLimitMessage(stage), retryAfter: rateLimit.retryAfterSec },
        { status: 429 }
      );
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    // 登录验证
    const session = await adapter.login(credentials);
    clearLoginRateLimit(stage, schoolId, userId);
    clearLoginRateLimit("password", schoolId, userId);
    clearLoginRateLimit("mfa", schoolId, userId);

    // 保存教务凭证到 SQLite(不含明文密码)
    const db = getServerDB();
    const confirmedUserId = resolveUserId(session.data.username || credentials.username);
    db.saveCredentials(schoolId, confirmedUserId, session.data, session.expiresAt);

    // 记录「记住密码」偏好与本次手动登录时间。
    // remember===true 时启用记住密码;否则关闭。lastManualLoginAt 始终更新为本次登录时间。
    setRememberSetting(schoolId, confirmedUserId, {
      enabled: !!remember,
      lastManualLoginAt: Date.now(),
    });

    // 服务端不再保存记住的密码；若历史版本留下过本地密码缓存，这里顺手清理。
    db.deleteData(`credential-password:${schoolId}:${confirmedUserId}`);

    return NextResponse.json({
      ok: true,
      schoolId: session.schoolId,
      userId: confirmedUserId,
      expiresAt: session.expiresAt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const userId = resolveUserId(credentials.username);
    const stage = getLoginStage(credentials);
    if (message.startsWith(HEBEAU_MFA_REQUIRED_PREFIX)) {
      clearLoginRateLimit("password", schoolId, userId);
      const [, payload = ""] = message.split(HEBEAU_MFA_REQUIRED_PREFIX);
      const [challengeId = "", maskedTarget = ""] = payload.split("::");
      return NextResponse.json({
        requiresMfa: true,
        challengeId,
        maskedTarget,
        method: "sms",
      });
    }
    if (schoolId && userId && shouldCountFailure(stage, message)) {
      recordLoginFailure(stage, schoolId, userId);
      if (stage === "mfa" && credentials.challengeId) {
        const updatedRateLimit = getLoginRateLimit(stage, schoolId, userId);
        if (updatedRateLimit.limited) {
          deleteHebauMfaChallenge(credentials.challengeId);
        }
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
