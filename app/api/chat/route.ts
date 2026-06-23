import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAIConfig } from "@/lib/ai-config";
import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import {
  callDeepSeekCompletion,
  callDeepSeekStream,
  DEFAULT_DEEPSEEK_MODEL,
  DEEPSEEK_MODELS,
  type ChatMessage,
} from "@/lib/chat/server-llm";
import { getServerDB } from "@/lib/server-db";

/**
 * AI 助手后台：仅支持 DeepSeek（用户自行在设置中填入 API Key）。
 *
 * 从 SQLite 读取加密存储的 API Key，由服务端代理请求 DeepSeek。
 * 流式响应仍翻译为 Ollama JSON 行格式，前端 useChat 无需改动。
 */

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const body = await req.json();
    const { model, messages, stream = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const db = getServerDB();
    const account = getAuthorizedAccount({}, db);
    const prefix = account ? `${account.schoolId}:${account.userId}` : "default";
    const aiConfig = getAIConfig(db, prefix);

    if (!aiConfig.apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API Key 未配置，请先在设置中填写" },
        { status: 503 }
      );
    }

    const selectedModel = typeof model === "string" && model ? model : aiConfig.model;
    const opts = { model: selectedModel, messages: messages as ChatMessage[], stream };

    if (!stream) {
      const { content } = await callDeepSeekCompletion(aiConfig.apiKey, opts);
      return NextResponse.json({ message: { role: "assistant", content }, done: true });
    }

    const streamBody = await callDeepSeekStream(aiConfig.apiKey, opts);
    return new NextResponse(streamBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `请求失败: ${message}` }, { status: 500 });
  }
}

// GET — 返回在线状态 + 可用模型列表
export async function GET(req: NextRequest) {
  if (!isTrustedOrigin(req, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const db = getServerDB();
    const account = getAuthorizedAccount({}, db);
    const prefix = account ? `${account.schoolId}:${account.userId}` : "default";
    const aiConfig = getAIConfig(db, prefix);

    return NextResponse.json({
      online: !!aiConfig.apiKey,
      configured: !!aiConfig.apiKey,
      model: aiConfig.model || DEFAULT_DEEPSEEK_MODEL,
      models: DEEPSEEK_MODELS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, online: false }, { status: 500 });
  }
}
