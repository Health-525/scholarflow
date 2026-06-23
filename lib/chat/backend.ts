// 聊天后端抽象：把「消息进、流式 token 出」封装成可插拔后端。
// - HttpBackend：走 /api/chat（OpenRouter 云端 Qwen，未配置 key 时回退本地 Ollama）。桌面/Web 用。
// - NativeBackend（Phase 3 新增）：走 Capacitor 原生插件、端侧 MNN 推理。手机用。
// 两者都吐统一的「Ollama 行格式」，由 parseOllamaStream 解析，对 useChat 透明。

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendOptions {
  onToken?: (delta: string) => void;
  model?: string;
  signal?: AbortSignal;
}

/** 可插拔聊天后端：发一组消息，逐 token 流式回调，返回完整文本。 */
export interface ChatBackend {
  send(messages: ChatMessage[], opts?: SendOptions): Promise<string>;
}

/**
 * 解析 Ollama 风格的流式响应体（每行一个 JSON：{ message: { content }, done }）。
 * 逐 token 调用 onToken，累加并返回完整文本。
 * 关键：跨 chunk 缓冲不完整的行；跳过坏行 / 不完整片段。
 */
export async function parseOllamaStream(
  stream: ReadableStream<Uint8Array>,
  onToken?: (delta: string) => void,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const handleLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    try {
      const json = JSON.parse(t);
      const content: string | undefined = json?.message?.content;
      if (content) {
        full += content;
        onToken?.(content);
      }
    } catch {
      /* 坏行 / 不完整片段：跳过 */
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // 最后一段可能不完整，留到下个 chunk 再拼
    for (const line of lines) handleLine(line);
  }
  if (buffer.trim()) handleLine(buffer); // flush 流末尾残留

  return full;
}

/**
 * 经 /api/chat 路由的 HTTP 后端（OpenRouter / Ollama，前端无感）。
 * fetch 通过构造函数注入，便于测试。
 */
export class HttpBackend implements ChatBackend {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async send(messages: ChatMessage[], opts: SendOptions = {}): Promise<string> {
    const res = await this.fetchFn("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: opts.model, messages, stream: true }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `请求失败 (${res.status})`);
    }

    if (!res.body) return "";
    return parseOllamaStream(res.body, opts.onToken);
  }
}
