/**
 * 服务端 LLM 调用封装
 *
 * 仅支持 DeepSeek（OpenAI 兼容接口）。API Key 由用户在设置中填入，经 AES-256-GCM
 * 加密后存储在 SQLite；调用时由服务端解密并代理请求。
 *
 * 不依赖前端环境变量，也不支持 Ollama，保证部署/开源版本行为一致。
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResult {
  content: string;
}

export interface ChatCompletionStreamOptions extends ChatCompletionOptions {
  onToken?: (delta: string) => void;
}

const DEEPSEEK_API_URL = process.env.DEEPSEEK_BASE_URL
  ? `${process.env.DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`
  : "https://api.deepseek.com/chat/completions";

// DeepSeek 官方可用模型（OpenAI 兼容接口）
// deepseek-chat / deepseek-reasoner 将于 2026/07/24 弃用，分别对应 v4-flash 的非思考与思考模式。
export const DEEPSEEK_MODELS = [
  { id: "deepseek-v4-pro", label: "DeepSeek-V4 Pro" },
  { id: "deepseek-v4-flash", label: "DeepSeek-V4 Flash" },
];

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

function buildRequestBody(opts: ChatCompletionOptions, stream: boolean) {
  const model = opts.model?.trim() || DEFAULT_DEEPSEEK_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    stream,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 4096,
  };
  return JSON.stringify(body);
}

function checkApiKey(apiKey: string) {
  if (!apiKey.trim()) {
    throw new LLMConfigError("DeepSeek API Key 未配置");
  }
}

/**
 * 非流式调用 DeepSeek Chat Completions。
 * 适合服务端一次性生成内容（如周报）。
 */
export async function callDeepSeekCompletion(
  apiKey: string,
  opts: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  checkApiKey(apiKey);

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: buildRequestBody(opts, false),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败 (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as {
    choices?: [{ message?: { content?: string } }];
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`DeepSeek 错误: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  return { content };
}

/**
 * 流式调用 DeepSeek Chat Completions，将 OpenAI SSE 翻译为 Ollama JSON 行格式。
 * 保留以兼容前端 useChat 已有的 parseOllamaStream。
 */
export async function callDeepSeekStream(
  apiKey: string,
  opts: ChatCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  checkApiKey(apiKey);

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: buildRequestBody(opts, true),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 流式请求失败 (${res.status}): ${text || res.statusText}`);
  }

  return openAISSEtoOllamaLines(res.body);
}

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
      buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith(":")) continue;
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
            controller.enqueue(
              encoder.encode(JSON.stringify({ message: { content: delta }, done: false }) + "\n")
            );
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
