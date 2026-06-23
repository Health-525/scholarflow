import { NextResponse } from "next/server";

import { getAISafeConfig, saveAIConfig } from "@/lib/ai-config";
import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/settings/ai
 *
 * 返回当前 AI 配置（不含 API Key 明文）。
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const db = getServerDB();
    const account = getAuthorizedAccount({}, db);
    const prefix = account ? `${account.schoolId}:${account.userId}` : "default";
    const config = getAISafeConfig(db, prefix);
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/settings/ai
 *
 * 保存 DeepSeek API Key（服务端加密）与模型选择。
 * 若 apiKey 传空字符串，则清除已保存的 key。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const body = (await request.json()) as { apiKey?: string; model?: string };
    const db = getServerDB();
    const account = getAuthorizedAccount({}, db);
    const prefix = account ? `${account.schoolId}:${account.userId}` : "default";

    saveAIConfig(db, prefix, {
      apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
      model: typeof body.model === "string" && body.model ? body.model : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
