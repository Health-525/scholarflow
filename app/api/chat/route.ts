import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// AI 助手后台：优先走 OpenRouter（云端 Qwen），未配置 key 时回退本地 Ollama。
// 关键：把 OpenRouter 的 OpenAI 流式(SSE)翻译成前端 useChat 已在用的 Ollama 行格式，
// 因此前端零改动。

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-7b-instruct";

// 暴露给前端模型选择器的 Qwen2.5 列表
const QWEN_MODELS = [
  { name: "qwen/qwen-2.5-7b-instruct", size: 0, modified_at: "" },
  { name: "qwen/qwen-2.5-72b-instruct", size: 0, modified_at: "" },
  { name: "qwen/qwen-2.5-coder-32b-instruct", size: 0, modified_at: "" },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, stream = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // 未配置 OpenRouter key → 回退本地 Ollama（保留原行为）
    if (!apiKey) {
      return ollamaProxy(model, messages, stream);
    }

    // 旧的 localStorage 里可能存着 "qwen2.5"（无斜杠的 Ollama 名），统一回退到默认 slug
    const selectedModel = typeof model === "string" && model.includes("/") ? model : DEFAULT_MODEL;

    const orRes = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://scholarflow.app",
        "X-Title": "ScholarFlow",
      },
      body: JSON.stringify({ model: selectedModel, messages, stream }),
    });

    if (!orRes.ok || !orRes.body) {
      const errText = await orRes.text().catch(() => "");
      return NextResponse.json({ error: `OpenRouter 错误: ${errText}` }, { status: orRes.status || 502 });
    }

    if (!stream) {
      const data = await orRes.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ message: { role: "assistant", content }, done: true });
    }

    // 流式：翻译 SSE → Ollama 行格式
    return new NextResponse(openAISSEtoOllamaLines(orRes.body), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `请求失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

// GET — 返回在线状态 + 可选模型；未配置 key 时回退查 Ollama
export async function GET() {
  if (process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ online: true, models: QWEN_MODELS });
  }
  try {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return NextResponse.json({ error: "AI 服务不可用", online: false }, { status: 503 });
    }
    const data = await res.json();
    return NextResponse.json({ online: true, models: data.models || [] });
  } catch {
    return NextResponse.json({ error: "AI 服务离线（未配置 OPENROUTER_API_KEY 且本地 Ollama 不可用）", online: false }, { status: 503 });
  }
}

// ---- helpers ----

// 将 OpenAI 兼容的 SSE 流翻译为前端期望的 Ollama JSON 行：{ message: { content }, done }
function openAISSEtoOllamaLines(src: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = src.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let closed = false;

  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (closed) return;
    closed = true;
    controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
    controller.close();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        finish(controller);
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留可能不完整的最后一行
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith(":")) continue;        // 跳过空行与 keep-alive 注释
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") {
          finish(controller);
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta: string | undefined = json?.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(JSON.stringify({ message: { content: delta }, done: false }) + "\n"));
          }
        } catch {
          /* 忽略非 JSON / 不完整片段 */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

// 回退：代理到本地 Ollama（保留原始行为）
async function ollamaProxy(model: unknown, messages: unknown, stream: boolean) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const selectedModel = (typeof model === "string" && model) || process.env.OLLAMA_MODEL || "qwen2.5";
  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages, stream }),
    });
    if (!r.ok || !r.body) {
      const errText = await r.text().catch(() => "");
      return NextResponse.json({ error: `Ollama 错误: ${errText}` }, { status: r.status || 502 });
    }
    if (stream) {
      return new NextResponse(r.body, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json(
      { error: "未配置 OPENROUTER_API_KEY，且本地 Ollama 不可用" },
      { status: 503 }
    );
  }
}
